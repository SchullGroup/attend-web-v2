"use client";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, CreditCard, Calendar, ShieldCheck, ChevronDown, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useGetMe } from "@/api/auth/hooks";
import {
  useGetKycStatus,
  useKycStep1,
  useKycStep2Skip,
  useKycStep3,
  useBvnSelfieCheck,
} from "@/api/kyc/hooks";
import { clearKycProgress } from "@/lib/kyc-progress";

// Figma AGM frames — identity verification as three stacked modals over the page the user
// is already on, replacing the old full-page /bvn → /chn → /liveness wizard. The API calls
// underneath are unchanged: step1 (BVN + DOB) → step2 skip → BVN/selfie match → step3.
//
// CHN (step 2) has no field here by design — the frames don't show one and it was always
// optional. It's settled with the existing skip endpoint so KYC can still reach "complete";
// users add a CHN later from Profile.
type Stage = "bvn" | "face" | "done";

// The capture is downscaled before encoding — a modern phone camera is 8-12MP, which is a
// multi-megabyte base64 string for a match that only needs a few hundred pixels.
const MAX_EDGE = 720;
const MAX_BYTES = 900_000;

const OVAL_W = 208;
const OVAL_H = 272;

export function VerifyIdentitySheet({
  open,
  onClose,
  live = false,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  /** AGM is in session — the frame swaps in a LIVE NOW badge and "join immediately" copy. */
  live?: boolean;
  onVerified?: () => void;
}) {
  const { data: meData } = useGetMe();
  const currentUser = meData?.data;

  const { data: kycResp } = useGetKycStatus();
  const kyc = kycResp?.data;
  const step1Done = !!kyc?.steps?.step1?.completed;
  // The BVN for the selfie re-check comes from the record the backend already holds — it is
  // never persisted on the device (a BVN in localStorage outlives the session on a shared machine).
  const verifiedBvn = kyc?.bvn;

  const [stage, setStage] = useState<Stage>("bvn");
  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [hasConsented, setHasConsented] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { mutate: submitStep1, isPending: step1Pending } = useKycStep1();
  const { mutate: skipStep2 } = useKycStep2Skip();
  const { mutate: bvnSelfieCheck } = useBvnSelfieCheck();
  const { mutate: submitStep3 } = useKycStep3();

  const isBvnValid = /^\d{11}$/.test(bvn);
  const isDobValid = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(dob);
  const canSubmitBvn = isBvnValid && isDobValid && hasConsented;

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Someone resuming with the BVN already on file has nothing to re-enter — open on the
  // face step instead of asking for a BVN the backend has already accepted.
  useEffect(() => {
    if (!open) return;
    setStage(step1Done ? "face" : "bvn");
    setErrorMsg(null);
  }, [open, step1Done]);

  useEffect(() => stopCamera, []);
  useEffect(() => {
    if (!open) stopCamera();
  }, [open]);

  function handleDobChange(rawVal: string) {
    const digits = rawVal.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) setDob(digits);
    else if (digits.length <= 4) setDob(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    else setDob(`${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`);
  }

  function onSubmitBvn(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitBvn) return;
    setErrorMsg(null);

    const [day, month, year] = dob.split("/");
    const payload = {
      bvn,
      dob: `${year}-${month}-${day}`,
      ...(currentUser?.firstName ? { firstName: currentUser.firstName } : {}),
      ...(currentUser?.lastName ? { lastName: currentUser.lastName } : {}),
      consent: true,
      hasConsent: true,
      bvnConsent: true,
      consentToBvnLookup: true,
    };

    submitStep1(payload, {
      // Step 2 (CHN) is optional and has no field in this flow, but it still has to be
      // settled or KYC never reaches "complete". A failure here isn't worth blocking on —
      // the face step is what the user came for.
      onSuccess: () => skipStep2(undefined, { onSettled: () => setStage("face") }),
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || "";
        if (/already.*verif/i.test(msg)) {
          setStage("face");
          return;
        }
        setErrorMsg(
          msg || "We couldn't verify your BVN. Please check your BVN and Date of Birth and try again."
        );
      },
    });
  }

  async function startCamera() {
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
      setCapturing(true);
    } catch {
      setErrorMsg("We couldn't access your camera. Please allow camera access and try again.");
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // videoWidth stays 0 until the first frame lands — capturing before then photographs
    // nothing and reads to the user as a failed attempt on a perfectly good camera.
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setErrorMsg("Your camera wasn't ready yet. Please hold still and try again.");
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
    setCapturing(false);

    if (!selfieImage) {
      setErrorMsg("We couldn't capture a clear image. Please try again.");
      return;
    }
    submitSelfie(selfieImage);
  }

  function submitSelfie(selfieImage: string) {
    setSubmitting(true);

    const doStep3 = () =>
      submitStep3(
        { selfieImage },
        {
          onSuccess: () => {
            clearKycProgress();
            setSubmitting(false);
            setStage("done");
          },
          onError: (err: any) => {
            setErrorMsg(
              err?.response?.data?.message || err?.message || "Liveness check failed. Please try again."
            );
            setSubmitting(false);
          },
        }
      );

    if (!verifiedBvn) {
      doStep3();
      return;
    }

    bvnSelfieCheck(
      { bvn: verifiedBvn, selfieImage },
      {
        // A failed match is still HTTP 200 — `data.valid` is the result, not the status code.
        onSuccess: (res) => {
          if (res?.data?.valid) {
            doStep3();
            return;
          }
          setErrorMsg(
            res?.data?.message || "Face match failed. Please ensure good lighting and a clear photo."
          );
          setSubmitting(false);
        },
        onError: (err: any) => {
          // 503 = Dojah unreachable. Nothing was saved and it's safe to retry, so don't tell
          // the user their face didn't match — that isn't what happened.
          if (err?.response?.status === 503) {
            setErrorMsg("Verification service is temporarily unavailable. Please try again in a moment.");
            setSubmitting(false);
            return;
          }
          const msg = err?.response?.data?.message || err?.message || "";
          if (/already.*verif/i.test(msg)) {
            doStep3();
            return;
          }
          setErrorMsg(msg || "We couldn't verify your photo. Please try again.");
          setSubmitting(false);
        },
      }
    );
  }

  function close() {
    stopCamera();
    setCapturing(false);
    onClose();
  }

  function finish() {
    close();
    onVerified?.();
  }

  // ── Stage 3: confirmed ──────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <Dialog open={open} onClose={finish} className="max-w-[380px]">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <BadgeCheck className="h-16 w-16 fill-emerald-500 text-white" />
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.4px] text-foreground">
              You&apos;re Confirmed!
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed tracking-[-0.14px] text-foreground/60">
              Your identity has been verified and your AGM attendance is confirmed. See you there!
            </p>
          </div>
          <Button fullWidth size="lg" onClick={finish}>
            Done
          </Button>
        </div>
      </Dialog>
    );
  }

  // ── Stage 2: face registration (dark panel per the frame) ───────────────────
  if (stage === "face") {
    return (
      <Dialog open={open} onClose={close} className="max-w-[340px] border-white/10 bg-[#1c1c1c]">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex w-full items-start justify-between">
            <span />
            <button
              onClick={close}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden className="text-lg leading-none">&times;</span>
            </button>
          </div>

          <h2 className="text-base font-semibold tracking-[-0.32px] text-white">Face Registration</h2>
          <p className="text-xs tracking-[-0.12px] text-white/60">
            Position your face inside the oval and tap capture
          </p>

          {errorMsg && (
            <div className="mt-3 w-full rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-left text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={capturing ? capture : startCamera}
            disabled={submitting}
            aria-label={capturing ? "Capture photo" : "Start camera"}
            className="relative mt-5 overflow-hidden bg-white/10 transition-opacity disabled:opacity-60"
            style={{ width: OVAL_W, height: OVAL_H, borderRadius: OVAL_W / 2 }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                capturing ? "block" : "hidden"
              )}
              style={{ transform: "scaleX(-1)" }}
            />
            {!capturing && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-10 w-10 text-white/70" />
              </span>
            )}
          </button>

          <p className="mt-5 text-xs tracking-[-0.12px] text-white/50">
            {submitting
              ? "Verifying your photo…"
              : capturing
                ? "Tap the oval to capture"
                : "Ensure your face is well-lit and clearly visible"}
          </p>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Dialog>
    );
  }

  // ── Stage 1: BVN + DOB + consent ────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={close} className="max-w-[420px]">
      <form onSubmit={onSubmitBvn} className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {live && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live now
              </span>
            )}
            <h2 className="text-base font-semibold tracking-[-0.32px] text-foreground">
              Verify your identity
            </h2>
            <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
              {live
                ? "This AGM is currently in session. Verify your BVN to join immediately."
                : "Enter your BVN to confirm your attendance at this year's AGM."}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <span aria-hidden className="text-lg leading-none">&times;</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div>
          <Input
            name="bvn"
            label="BVN"
            inputMode="numeric"
            placeholder="BVN"
            leftIcon={<CreditCard className="h-4 w-4" />}
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
          />
          <p className="mt-1.5 text-xs text-foreground/60">
            Dial <span className="font-semibold text-emerald-600">*565*0#</span> to retrieve it.
          </p>
        </div>

        {/* Not in the frame, but the backend's step 1 verifies BVN *against* a date of
            birth — dropping it would break the lookup the modal exists to perform. */}
        <Input
          name="dob"
          label="Date of Birth"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          leftIcon={<Calendar className="h-4 w-4" />}
          value={dob}
          onChange={(e) => handleDobChange(e.target.value)}
        />

        {/* Mandatory NDPA/CBN consent — un-ticked by default, gates submit. */}
        <div className="space-y-2.5 rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-3">
          <label
            htmlFor="bvnConsent"
            className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-foreground"
          >
            <input
              id="bvnConsent"
              name="bvnConsent"
              type="checkbox"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-foreground/20 accent-primary"
            />
            <span>
              I consent to the processing of my BVN and Date of Birth for identity verification.
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowDisclosure((v) => !v)}
            aria-expanded={showDisclosure}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Read regulatory disclosure
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showDisclosure && "rotate-180")} />
          </button>

          {showDisclosure && (
            <div className="space-y-2 rounded-lg border border-foreground/[0.06] bg-white p-3 text-[11px] leading-relaxed text-foreground/60">
              <p className="font-semibold text-foreground">
                Pursuant to the Nigeria Data Protection Act (NDPA 2023) &amp; CBN Regulations:
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  We require your explicit consent to retrieve and validate your BVN biodata via our
                  licensed verification partners (Dojah / NIBSS).
                </li>
                <li>
                  Your identity details are used <strong>solely</strong> to verify your eligibility for
                  shareholder participation and voting.
                </li>
                <li>
                  Your BVN will <strong>never</strong> be shared with unauthorized third parties or used
                  to access your bank accounts.
                </li>
              </ul>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  By ticking the box above, you authorize Attend and its licensed partners to verify
                  your BVN details.
                </span>
              </div>
            </div>
          )}
        </div>

        <Button type="submit" fullWidth size="lg" loading={step1Pending} disabled={!canSubmitBvn}>
          {step1Pending ? "Verifying…" : "Verify & Confirm"}
        </Button>

        <p className="text-center text-xs text-foreground/50">
          Your BVN is encrypted and used only to verify your identity.
        </p>
      </form>
    </Dialog>
  );
}
