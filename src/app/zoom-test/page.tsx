"use client";
import { useRef, useState } from "react";

// Standalone spike to verify the Zoom Meeting SDK (Component View) works in-app.
// The SDK is loaded from Zoom's CDN (self-contained bundle) rather than the npm
// package, which sidesteps the bundler's UMD/peer-dependency issues entirely.
const ZOOM_VERSION = "6.2.0";
const ZOOM_SDK_URL = `https://source.zoom.us/${ZOOM_VERSION}/zoom-meeting-embedded-${ZOOM_VERSION}.min.js`;

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    ZoomMtgEmbedded?: any;
  }
}

// The embedded bundle attaches window.ZoomMtgEmbedded (sometimes under .default),
// occasionally a tick after the script's load event — so poll for it.
function getEmbedded(): any | null {
  const g = window.ZoomMtgEmbedded as any;
  const api = g?.default ?? g;
  return api && typeof api.createClient === "function" ? api : null;
}

function waitForEmbedded(timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const api = getEmbedded();
      if (api) return resolve(api);
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("ZoomMtgEmbedded global not found after load"));
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

// The embedded 6.x CDN bundle is NOT self-contained — it expects React/ReactDOM
// (and Redux/lodash) as globals, loaded before it.
const ZOOM_VENDOR = [
  `https://source.zoom.us/${ZOOM_VERSION}/lib/vendor/react.min.js`,
  `https://source.zoom.us/${ZOOM_VERSION}/lib/vendor/react-dom.min.js`,
  `https://source.zoom.us/${ZOOM_VERSION}/lib/vendor/redux.min.js`,
  `https://source.zoom.us/${ZOOM_VERSION}/lib/vendor/lodash.min.js`,
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-zoom="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.setAttribute("data-zoom", src);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.body.appendChild(s);
  });
}

async function loadZoomSdk(): Promise<any> {
  if (getEmbedded()) return getEmbedded();

  const w = window as any;
  // Hide module/exports/define so each UMD bundle (React, ReactDOM, Zoom) attaches
  // to window globals instead of a leaked module system (extensions/Turbopack).
  const saved = { define: w.define, exports: w.exports, module: w.module };
  w.define = undefined;
  w.exports = undefined;
  w.module = undefined;
  try {
    for (const src of ZOOM_VENDOR) await loadScript(src);
    await loadScript(ZOOM_SDK_URL);
    return await waitForEmbedded();
  } finally {
    w.define = saved.define;
    w.exports = saved.exports;
    w.module = saved.module;
  }
}

export default function ZoomTestPage() {
  const [meetingNumber, setMeetingNumber] = useState("724 1311 4882");
  const [passcode, setPasscode] = useState("ENz4dW");
  const [userName, setUserName] = useState("Attend Test");
  const [status, setStatus] = useState<string>("Idle");
  const [joining, setJoining] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  async function join() {
    setJoining(true);
    setStatus("Requesting signature…");
    try {
      const mn = meetingNumber.replace(/\D/g, "");

      const res = await fetch("/api/zoom/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNumber: mn, role: 0 }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Signature request failed");

      setStatus("Loading Zoom SDK (CDN)…");
      const ZoomMtgEmbedded = await loadZoomSdk();
      const client = ZoomMtgEmbedded.createClient();

      await client.init({
        zoomAppRoot: rootRef.current,
        language: "en-US",
        patchJsMedia: true,
      });

      setStatus("Joining meeting…");
      await client.join({
        sdkKey: data.sdkKey,
        signature: data.signature,
        meetingNumber: mn,
        password: passcode,
        userName,
      });

      setStatus("✅ Joined");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus("❌ " + msg);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Zoom Meeting SDK — test</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        Joins a Zoom meeting inside the app (Component View). Status: <b>{status}</b>
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <input
          value={meetingNumber}
          onChange={(e) => setMeetingNumber(e.target.value)}
          placeholder="Meeting ID"
          style={inputStyle}
        />
        <input
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          style={inputStyle}
        />
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
        />
        <button
          onClick={join}
          disabled={joining}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: joining ? "#888" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: joining ? "default" : "pointer",
          }}
        >
          {joining ? "Joining…" : "Join"}
        </button>
      </div>

      {/* Zoom renders the meeting UI into this container */}
      <div ref={rootRef} id="zoom-root" style={{ marginTop: 16 }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};
