"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKycStep3 } from "@/api/kyc/hooks";

type Stage = "idle" | "detecting" | "verifying" | "verified";

const OVAL_W = 224;
const OVAL_H = 296;

export default function LivenessPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: submitStep3 } = useKycStep3();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        "We couldn't access your camera. Please allow camera access and try again, or skip for now.",
      );
    }
  }

  function captureAndSubmit() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    let selfieImage = "";
    if (video && canvas && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Send raw base64 (strip the "data:image/jpeg;base64," prefix) — the
        // backend's liveness check expects the bare base64 string.
        selfieImage = canvas.toDataURL("image/jpeg", 0.8).split(",")[1] ?? "";
      }
    }
    stopCamera();

    if (!selfieImage) {
      setErrorMsg("We couldn't capture a clear image. Please try again.");
      setStage("idle");
      return;
    }

    setStage("verifying");
    submitStep3(
      { selfieImage },
      {
        onSuccess: () => {
          sessionStorage.removeItem("kyc_bvn");
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

    // After the scan, capture a frame and submit step 3.
    detectTimerRef.current = setTimeout(() => {
      clearInterval(scanIntervalRef.current!);
      clearInterval(pulseIntervalRef.current!);
      captureAndSubmit();
    }, 2800);

    return () => {
      clearInterval(scanIntervalRef.current!);
      clearInterval(pulseIntervalRef.current!);
      clearTimeout(detectTimerRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function onSkip() {
    stopCamera();
    router.push("/success");
  }

  const busy = stage === "detecting" || stage === "verifying";

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div
          className={cn(
            "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            stage === "verified" ? "bg-emerald-100" : "bg-gray-100",
          )}
        >
          {stage === "verified" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.31 3.13-6 7-6s7 2.69 7 6" />
              <path d="M3 5.5A9 9 0 0 1 5.5 3M21 5.5A9 9 0 0 0 18.5 3M3 18.5A9 9 0 0 0 5.5 21M21 18.5A9 9 0 0 1 18.5 21" />
            </svg>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {stage === "verified" ? "Identity submitted!" : "Face Verification"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stage === "idle" && "A quick selfie to confirm you are the account holder."}
          {stage === "detecting" && "Hold still — capturing your face…"}
          {stage === "verifying" && "Submitting your verification…"}
          {stage === "verified" && "Your selfie has been submitted for verification."}
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Oval camera frame */}
      <div className="flex flex-col items-center">
        <div
          className="relative flex items-center justify-center"
          style={{ width: OVAL_W + 56, height: OVAL_H + 56 }}
        >
          {/* Pulsing ring — visible only while detecting */}
          {stage === "detecting" && (
            <div
              className="absolute rounded-full border-2 border-gray-900 transition-all duration-700"
              style={{
                width: OVAL_W + 56,
                height: OVAL_H + 56,
                borderRadius: (OVAL_W + 56) / 2,
                transform: pulseExpanded ? "scale(1.1)" : "scale(1)",
                opacity: pulseExpanded ? 0.12 : 0.35,
              }}
            />
          )}

          {/* Oval itself */}
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
            {/* Live camera feed (hidden once verified) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: "scaleX(-1)", display: stage === "verified" ? "none" : "block" }}
            />

            {/* Scanning line */}
            {stage === "detecting" && (
              <div
                className="absolute left-0 right-0 h-px"
                style={{
                  top: `${scanY}%`,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                }}
              />
            )}

            {/* Verified state */}
            {stage === "verified" && (
              <CheckCircle2 className="relative h-16 w-16 text-emerald-400" />
            )}

            {/* Idle: face silhouette oval */}
            {stage === "idle" && (
              <div
                className="relative rounded-full border border-white/20"
                style={{ width: 86, height: 110 }}
              />
            )}

            {/* Corner scan brackets */}
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

        {/* Instruction label */}
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
            <span className="h-2 w-2 rounded-full bg-gray-900 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {stage === "verifying" ? "Submitting…" : "Analyzing biometrics…"}
            </span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* CTA buttons */}
      <div className="flex flex-col gap-3">
        {stage === "idle" && (
          <>
            <Button fullWidth onClick={startCheck}>
              Start Check
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors py-1"
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

      {/* Privacy note */}
      <p className="text-center text-xs text-muted-foreground">
        Your selfie is used once to confirm your identity and is processed securely
        by our verification partner.
      </p>
    </div>
  );
}
