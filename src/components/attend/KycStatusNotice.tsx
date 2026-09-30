"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { kycKeys } from "@/api/kyc/hooks";
import { isKycDeclined, isKycFull } from "@/lib/kyc-gate";
import type { KycStatusData, KycStepDetail } from "@/types";

// The terminal states of verification: submitted-and-waiting, approved, or declined.
//
// Ported from the old `/success` route, which was the only screen in the app that could render
// "under review" and "declined". The modal's own done stage knew nothing but the happy path, so
// a user whose KYC went to the officer queue was told "You're Confirmed!" and then blocked by
// every gate — the status they were shown and the status being enforced disagreed.
//
// Presentational apart from the refetch button; the host decides the surrounding chrome and
// which buttons to offer.

type Tone = "emerald" | "amber" | "muted";
const TONE_CLASS: Record<Tone, string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-600",
  muted: "text-foreground/50",
};

function stepStatus(s?: KycStepDetail): { label: string; tone: Tone } {
  if (!s) return { label: "Pending", tone: "amber" };
  if (s.skipped) return { label: "Skipped", tone: "muted" };
  if (s.completed && s.pendingReview) return { label: "Under review", tone: "amber" };
  if (s.completed) return { label: "Confirmed", tone: "emerald" };
  return { label: "Pending", tone: "amber" };
}

export function KycStatusNotice({
  kyc,
  isLoading = false,
  actions,
}: {
  kyc?: KycStatusData;
  isLoading?: boolean;
  /** Buttons for the host's context — "Back to AGMs", "Try again", "Done". */
  actions?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const verified = isKycFull(kyc);
  const declined = isKycDeclined(kyc);

  const header = declined
    ? {
        bg: "bg-red-100",
        icon: <XCircle className="h-9 w-9 text-red-600" />,
        title: "Verification declined",
        text:
          kyc?.rejectionReason ||
          "Your verification could not be approved. Please review your details and submit again.",
      }
    : verified
      ? {
          bg: "bg-emerald-100",
          icon: <CheckCircle2 className="h-9 w-9 text-emerald-600" />,
          title: "You're verified!",
          text: "Your identity has been confirmed. You can now register for AGMs, cast votes, and apply to challenges.",
        }
      : {
          bg: "bg-amber-100",
          icon: <Clock className="h-9 w-9 text-amber-600" />,
          title: "Verification submitted",
          text: "Your details have been received. Our team will review and confirm your identity — this usually takes a few minutes.",
        };

  const rows = [
    { detail: kyc?.steps?.step1, fallback: "BVN" },
    { detail: kyc?.steps?.step2, fallback: "CHN" },
    { detail: kyc?.steps?.step3, fallback: "Face liveness" },
  ];

  return (
    <div className="space-y-5 text-center">
      <div
        className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${header.bg}`}
      >
        {header.icon}
      </div>
      <div>
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">{header.title}</h2>
        <p className="mt-2 text-sm tracking-[-0.14px] text-foreground/60">{header.text}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-foreground/6 bg-foreground/3 p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          {verified ? "Verification details" : "Submitted for verification"}
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-5 animate-pulse rounded bg-foreground/6" />
            ))}
          </div>
        ) : (
          rows.map(({ detail, fallback }) => {
            const { label, tone } = stepStatus(detail);
            return (
              <div key={fallback} className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">{detail?.title || fallback}</span>
                <span className={`font-medium ${TONE_CLASS[tone]}`}>{label}</span>
              </div>
            );
          })
        )}
      </div>

      {!verified && !declined && (
        <>
          <p className="text-xs text-foreground/60">
            You&apos;ll be notified once your identity is confirmed. You can still browse events
            while verification is in progress.
          </p>
          {/* Queries are cached for 60s with no refetch on window focus, so an officer's
              approval never reaches a page the user is already sitting on. This is the only
              way out of the notice short of a reload. */}
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: kycKeys.status })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-70"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Check status
          </button>
        </>
      )}

      {actions && <div className="flex flex-col gap-2 pt-1">{actions}</div>}
    </div>
  );
}
