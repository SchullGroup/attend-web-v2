"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBvnSelfieCheck, useKycStep3, useGetKycStatus } from "@/api/kyc/hooks";
import { getStoredSelfie, clearKycProgress } from "@/lib/kyc-progress";

type Stage = "idle" | "detecting" | "verifying" | "verified";

const OVAL_W = 224;
const OVAL_H = 296;

// The capture used to be sent at the camera's native resolution, which on a modern phone
// is 8-12MP — a multi-megabyte base64 string for a face match that only needs a few
// hundred pixels. Downscaling before encoding keeps the payload small enough that the
// request itself can't be what fails, and steps the quality down if it's still large.
const MAX_EDGE = 720;
const MAX_BYTES = 900_000;

export default function LivenessPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: bvnSelfieCheck } = useBvnSelfieCheck();
  const { mutate: submitStep3 } = useKycStep3();

  // The BVN comes from the KYC record the backend already holds. It is never stored on
  // the device — a BVN in localStorage stays readable on a shared machine long after the
  // session ends, which we're not permitted to do.
  const { data: kycResp } = useGetKycStatus();
  const verifiedBvn = kycResp?.data?.bvn;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if photo was already verified during Step 1 (BVN & Photo Match)
  const savedSelfie = getStoredSelfie();

  // Scan line (detecting state)
  const scanDirRef = useRef(1);
  const [scanY, setScanY] = useState(0);
  const [pulseExpanded, setPulseExpanded] = useState(false);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => stopCamera, []);

  async function startCheck() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStage("detecting");
    } catch {
      setErrorMsg(
        "We couldn't access your camera. Please allow camera access and try again.",
      );
    }
  }

  function submitSelfie(selfieImage: string) {
    setStage("verifying");

    const doStep3 = () => {
      submitStep3(
        { selfieImage },
        {
          onSuccess: () => {
            clearKycProgress();
            setStage("verified");
          },
          onError: (err: any) => {
            setErrorMsg(
              err?.response?.data?.message ||
                err?.message ||
                "Liveness check failed. Please try again.",
            );
            setStage("idle");
          },
        },
      );
    };

    if (verifiedBvn) {
      // Standalone BVN + selfie re-check before submitting liveness.
      bvnSelfieCheck(
        { bvn: verifiedBvn, selfieImage },
        {
          // A failed match is still HTTP 200 — the result is `data.valid`, not the
          // status code. Reading only onSuccess (as this did) let every failed match
          // straight through, which made the check a no-op.
          onSuccess: (res) => {
            if (res?.data?.valid) {
              doStep3();
              return;
            }
            // The backend's message is specific (it includes the confidence score and
            // lighting advice), so surface it verbatim rather than a generic line.
            setErrorMsg(
              res?.data?.message ||
                "Face match failed. Please ensure good lighting and a clear photo.",
            );
            setStage("idle");
          },
          onError: (err: any) => {
            // 503 = Dojah unreachable. Nothing was saved and it's safe to retry, so
            // don't tell the user their face didn't match — that isn't what happened.
            if (err?.response?.status === 503) {
              setErrorMsg(
                "Verification service is temporarily unavailable. Please try again in a moment.",
              );
              setStage("idle");
              return;
            }
            const msg = err?.response?.data?.message || err?.message || "";
            if (/already.*verif/i.test(msg)) {
              doStep3();
              return;
            }
            setErrorMsg(msg || "We couldn't verify your photo. Please try again.");
            setStage("idle");
          },
        },
      );
    } else {
      doStep3();
    }
  }

  function captureAndSubmit() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // `videoWidth` stays 0 until the first frame has actually arrived. Firing capture off a
    // timer meant a slow camera could be photographed before it had produced anything, which
    // reads to the user as "we couldn't capture a clear image" on a perfectly good attempt.
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      stopCamera();
      setErrorMsg(
        "Your camera wasn't ready yet. Please try again and hold still for a moment.",
      );
      setStage("idle");
      return;
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    let selfieImage = "";
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.6, 0.45]) {
        selfieImage = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
        if (selfieImage.length <= MAX_BYTES) break;
      }
    }
    stopCamera();

    if (!selfieImage) {
      setErrorMsg("We couldn't capture a clear image. Please try again.");
      setStage("idle");
      return;
    }

    submitSelfie(selfieImage);
  }

  // Quick 1-click submit if photo was already verified at Step 1
  function submitSavedSelfie() {
    if (!savedSelfie) return;
    submitSelfie(savedSelfie);
  }

  useEffect(() => {
    if (stage !== "detecting") {
      clearInterval(scanIntervalRef.current!);
      clearInterval(pulseIntervalRef.current!);
      clearTimeout(detectTimerRef.current!);
      setScanY(0);
      scanDirRef.current = 1;
      setPulseExpanded(false);
      return;
    }

    scanIntervalRef.current = setInterval(() => {
      setScanY((y) => {
        const next = y + scanDirRef.current * 1.8;
        if (next >= 100) { scanDirRef.current = -1; return 100; }
        if (next <= 0) { scanDirRef.current = 1; return 0; }
        return next;
      });
    }, 30);

    pulseIntervalRef.current = setInterval(() => {
      setPulseExpanded((v) => !v);
    }, 900);

    // Capture once the scan animation has run *and* the camera is actually producing
    // frames. The old fixed 2.8s timer assumed the second was implied by the first; on a
    // slow-starting camera it wasn't, and the shot was taken of a blank stream.
    let waited = 0;
    const attemptCapture = () => {
      const video = videoRef.current;
      const ready = !!video && video.readyState >= 2 && video.videoWidth > 0;
      if (!ready && waited < 5000) {
        waited += 200;
        detectTimerRef.current = setTimeout(attemptCapture, 200);
        return;
      }
      clearInterval(scanIntervalRef.current!);
      clearInterval(pulseIntervalRef.current!);
      captureAndSubmit();
    };

    detectTimerRef.current = setTimeout(attemptCapture, 2800);

    return () => {
      clearInterval(scanIntervalRef.current!);
      clearInterval(pulseIntervalRef.current!);
      clearTimeout(detectTimerRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function onSkip() {
    stopCamera();
    clearKycProgress();
    router.push("/success");
  }

  const busy = stage === "detecting" || stage === "verifying";

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div
          className={cn(
            "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors",
            stage === "verified" ? "bg-emerald-100" : "bg-foreground/[0.04]",
          )}
        >
          {stage === "verified" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-foreground/70" />
          )}
        </div>
        <h1 className="text-xl font-medium tracking-[-0.6px] text-foreground">
          {stage === "verified" ? "Identity Verified!" : "Face Liveness Check"}
        </h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          {stage === "idle" && savedSelfie && "Your BVN photo is ready. Click below to complete liveness verification."}
          {stage === "idle" && !savedSelfie && "A quick face scan to confirm you are the account holder."}
          {stage === "detecting" && "Hold still — capturing your face…"}
          {stage === "verifying" && "Submitting your verification…"}
          {stage === "verified" && "Your liveness verification is complete."}
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Saved Photo Preview (if captured during Step 1) or Camera Oval */}
      {savedSelfie && stage === "idle" ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500 bg-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${savedSelfie}`}
              alt="Verified selfie"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> BVN Photo Matched
            </p>
            <p className="text-xs text-emerald-700">Ready to complete final liveness verification</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div
            className="relative flex items-center justify-center"
            style={{ width: OVAL_W + 56, height: OVAL_H + 56 }}
          >
            {stage === "detecting" && (
              <div
                className="absolute rounded-full border-2 border-foreground transition-all duration-700"
                style={{
                  width: OVAL_W + 56,
                  height: OVAL_H + 56,
                  borderRadius: (OVAL_W + 56) / 2,
                  transform: pulseExpanded ? "scale(1.1)" : "scale(1)",
                  opacity: pulseExpanded ? 0.12 : 0.35,
                }}
              />
            )}

            <div
              className="relative overflow-hidden flex items-center justify-center transition-colors duration-500"
              style={{
                width: OVAL_W,
                height: OVAL_H,
                borderRadius: OVAL_W / 2,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: stage === "verified" ? "#10b981" : stage === "detecting" ? "#111827" : "#d1d5db",
                backgroundColor: stage === "verified" ? "#052e16" : "#1a1f2e",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
                style={{ transform: "scaleX(-1)", display: stage === "verified" ? "none" : "block" }}
              />

              {stage === "detecting" && (
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: `${scanY}%`,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                  }}
                />
              )}

              {stage === "verified" && (
                <CheckCircle2 className="relative h-16 w-16 text-emerald-400" />
              )}

              {stage === "idle" && (
                <div
                  className="relative rounded-full border border-white/20"
                  style={{ width: 86, height: 110 }}
                />
              )}

              {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                  key={pos}
                  className={cn(
                    "absolute w-5 h-5 transition-colors duration-500",
                    stage === "verified" ? "border-emerald-400" : "border-white/40",
                    pos === "tl" && "top-3 left-3 border-t-2 border-l-2 rounded-tl",
                    pos === "tr" && "top-3 right-3 border-t-2 border-r-2 rounded-tr",
                    pos === "bl" && "bottom-3 left-3 border-b-2 border-l-2 rounded-bl",
                    pos === "br" && "bottom-3 right-3 border-b-2 border-r-2 rounded-br",
                  )}
                />
              ))}
            </div>
          </div>

          <p
            className={cn(
              "mt-3 text-sm font-semibold text-center transition-colors",
              stage === "verified" ? "text-emerald-600" : "text-foreground",
            )}
          >
            {stage === "idle" && "Position your face within the oval"}
            {stage === "detecting" && "Hold still…"}
            {stage === "verifying" && "Verifying…"}
            {stage === "verified" && "Submitted ✓"}
          </p>

          {busy && (
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
              <span className="text-xs text-foreground/60">
                {stage === "verifying" ? "Submitting…" : "Framing your photo…"}
              </span>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* CTA buttons */}
      <div className="flex flex-col gap-3">
        {stage === "idle" && savedSelfie && (
          <>
            <Button fullWidth onClick={submitSavedSelfie}>
              Complete Verification
            </Button>
            <button
              type="button"
              onClick={startCheck}
              className="text-xs text-center text-foreground/60 hover:text-foreground transition-colors"
            >
              Re-scan with camera instead
            </button>
          </>
        )}

        {stage === "idle" && !savedSelfie && (
          <>
            <Button fullWidth onClick={startCheck}>
              Start Scan
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-center text-foreground/60 hover:text-foreground transition-colors py-1"
            >
              Skip — I&apos;ll complete this later
            </button>
          </>
        )}

        {busy && (
          <Button fullWidth disabled loading>
            {stage === "verifying" ? "Verifying…" : "Capturing…"}
          </Button>
        )}

        {stage === "verified" && (
          <Button fullWidth onClick={() => router.push("/success")}>
            Continue
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-foreground/60">
        Your verification data is encrypted and processed securely.
      </p>
    </div>
  );
}
