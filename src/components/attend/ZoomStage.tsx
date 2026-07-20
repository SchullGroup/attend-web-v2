"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseZoomUrl, fetchStreamUrl } from "@/lib/zoom";

/* eslint-disable @typescript-eslint/no-explicit-any */

type ZoomStatus = "connecting" | "joined" | "error" | "left";

interface Props {
  eventId: string;
  meetingNumber: string;
  passcode: string;
  userName: string;
}

// Renders a live Zoom meeting (Client View) inside the video slot via an iframe
// hosting public/zoom-meeting.html. Communicates over postMessage:
//   Parent → iframe: ZOOM_JOIN
//   iframe → Parent: ZOOM_READY, ZOOM_JOINED, ZOOM_ERROR, ZOOM_LEFT
//
// Retry-once: if join fails with a "meeting not found" style error, re-fetches
// streamUrl from the backend (the meeting may have been rotated) and retries
// with the fresh values before showing an error.
export function ZoomStage({ eventId, meetingNumber, passcode, userName }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<ZoomStatus>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const retriedRef = useRef(false);
  const joinSentRef = useRef(false);
  // Track the current meeting values (may change on retry).
  const meetingRef = useRef({ meetingNumber, passcode });
  meetingRef.current = { meetingNumber, passcode };

  // Fetch the join signature from our BFF route.
  const getSignature = useCallback(async (mn: string) => {
    const res = await fetch("/api/zoom/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingNumber: mn, role: 0 }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Could not get join signature");
    return data as { signature: string; sdkKey: string };
  }, []);

  // Send ZOOM_JOIN to the iframe with the current meeting params + signature.
  const sendJoin = useCallback(
    async (mn: string, pwd: string) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      const sig = await getSignature(mn);
      iframe.contentWindow.postMessage(
        {
          type: "ZOOM_JOIN",
          sdkKey: sig.sdkKey,
          signature: sig.signature,
          meetingNumber: mn,
          password: pwd,
          userName,
        },
        window.location.origin,
      );
    },
    [getSignature, userName],
  );

  // Retry logic: fetch fresh streamUrl, re-parse, and send a new ZOOM_JOIN.
  const retryWithFreshStream = useCallback(async () => {
    if (retriedRef.current) return false; // only retry once
    retriedRef.current = true;
    const freshUrl = await fetchStreamUrl(eventId);
    const parsed = parseZoomUrl(freshUrl);
    if (!parsed) return false;
    meetingRef.current = { meetingNumber: parsed.meetingNumber, passcode: parsed.passcode };
    setStatus("connecting");
    setErrorMsg("");
    // Small delay so the iframe is ready.
    await new Promise((r) => setTimeout(r, 500));
    try {
      await sendJoin(parsed.meetingNumber, parsed.passcode);
      return true;
    } catch {
      return false;
    }
  }, [eventId, sendJoin]);

  // Listen for messages from the iframe (ZOOM_JOINED, ZOOM_ERROR, ZOOM_LEFT).
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data.type !== "string") return;

      switch (event.data.type) {
        case "ZOOM_JOINED":
          setStatus("joined");
          break;

        case "ZOOM_ERROR": {
          const msg = (event.data.message || "").toLowerCase();
          const isRotation =
            msg.includes("not found") ||
            msg.includes("invalid") ||
            msg.includes("ended") ||
            msg.includes("does not exist");
          if (isRotation && !retriedRef.current) {
            retryWithFreshStream().then((ok) => {
              if (!ok) {
                setStatus("error");
                setErrorMsg(event.data.message || "Meeting not found.");
              }
            });
          } else {
            setStatus("error");
            setErrorMsg(event.data.message || "Could not join the meeting.");
          }
          break;
        }

        case "ZOOM_LEFT":
          setStatus("left");
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [retryWithFreshStream]);

  // When the iframe finishes loading (all synchronous scripts done, ZoomMtg ready),
  // fetch the signature and post ZOOM_JOIN. This replaces the ZOOM_READY handshake
  // and eliminates the race condition where the iframe's message arrived before the
  // parent's listener was attached.
  const handleIframeLoad = useCallback(() => {
    // Guard: only send ZOOM_JOIN once. Zoom's Client View navigates
    // internally which re-fires onLoad — ignore those subsequent loads.
    if (joinSentRef.current) return;
    // Don't join if the iframe loaded the ?left=1 page.
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      if (iframe.src.includes('left=1')) return;
    } catch { /* cross-origin — ignore */ }
    joinSentRef.current = true;
    sendJoin(meetingRef.current.meetingNumber, meetingRef.current.passcode)
      .then(() => {
        // Fallback: if ZOOM_JOINED never arrives (the Client View's success
        // callback doesn't always fire in SDK 6.x), reveal the meeting
        // anyway after 12 seconds — same pattern the old code used.
        setTimeout(() => {
          setStatus((s) => (s === "connecting" ? "joined" : s));
        }, 12000);
      })
      .catch((e: any) => {
        joinSentRef.current = false;
        setStatus("error");
        setErrorMsg(e?.message || "Could not get join signature");
      });
  }, [sendJoin]);

  // Hold the timestamp in state so it only cache-busts on mount or explicit rejoin.
  // Using Date.now() directly in the component body caused the iframe to reload
  // every time the parent (LiveRoom) re-rendered (e.g. from countdown polling).
  const [sessionTime, setSessionTime] = useState(Date.now());
  const iframeSrc = `/zoom-meeting.html?t=${sessionTime}`;

  // Rejoin handler: reset the iframe to get a fresh Zoom session.
  function handleRejoin() {
    retriedRef.current = false;
    joinSentRef.current = false;
    setStatus("connecting");
    setErrorMsg("");
    setSessionTime(Date.now());
  }

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-2xl">
      {/* Overlay: connecting / error / left — hides while joined */}
      {status !== "joined" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-center text-white">
          {status === "error" ? (
            <>
              <p className="text-sm font-semibold text-white/90">
                Couldn&apos;t join the meeting
              </p>
              <p className="text-xs text-white/60">{errorMsg}</p>
              <button
                onClick={handleRejoin}
                className="mt-2 rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              >
                Try again
              </button>
            </>
          ) : status === "left" ? (
            <>
              <p className="text-sm font-semibold text-white/90">
                You left the meeting
              </p>
              <button
                onClick={handleRejoin}
                className="mt-2 rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              >
                Rejoin
              </button>
            </>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
              <p className="text-sm font-semibold text-white/85">
                Connecting to the meeting…
              </p>
            </>
          )}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Zoom Meeting"
        className="absolute inset-0 h-full w-full border-0"
        allow="camera; microphone; autoplay; fullscreen; display-capture"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
