"use client";
import Link from "next/link";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { KycStepDetail } from "@/types";

type Tone = "emerald" | "amber" | "muted";
const TONE_CLASS: Record<Tone, string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-600",
  muted: "text-muted-foreground",
};

function stepStatus(s?: KycStepDetail): { label: string; tone: Tone } {
  if (!s) return { label: "Pending", tone: "amber" };
  if (s.skipped) return { label: "Skipped", tone: "muted" };
  if (s.completed && s.pendingReview) return { label: "Under review", tone: "amber" };
  if (s.completed) return { label: "Confirmed", tone: "emerald" };
  return { label: "Pending", tone: "amber" };
}

export default function KycSuccessPage() {
  const { data, isLoading } = useGetKycStatus();
  const kyc = data?.data;

  const verified = kyc?.kycStatus === "FULL_KYC";
  const rejected = !!kyc?.rejected || kyc?.kycStatus === "REJECTED";

  const header = rejected
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
        title: "Verification submitted!",
        text: "Your details have been received. Our team will review and confirm your identity — this usually takes a few minutes.",
      };

  const rows = [
    { detail: kyc?.steps?.step1, fallback: "BVN" },
    { detail: kyc?.steps?.step2, fallback: "CHN" },
    { detail: kyc?.steps?.step3, fallback: "Face liveness" },
  ];

  return (
    <div className="space-y-6 text-center">
      <div className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${header.bg}`}>
        {header.icon}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{header.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{header.text}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {verified ? "Verification details" : "Submitted for verification"}
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-5 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          rows.map(({ detail, fallback }) => {
            const { label, tone } = stepStatus(detail);
            return (
              <div key={fallback} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{detail?.title || fallback}</span>
                <span className={`font-medium ${TONE_CLASS[tone]}`}>{label}</span>
              </div>
            );
          })
        )}
      </div>

      {!verified && !rejected && (
        <p className="text-xs text-muted-foreground">
          You&apos;ll be notified once your identity is confirmed. You can still
          browse events while verification is in progress.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {verified ? (
          <Link href="/agm" className="block">
            <Button fullWidth size="lg">Browse AGMs</Button>
          </Link>
        ) : (
          <Link href="/" className="block">
            <Button fullWidth size="lg">Go to home</Button>
          </Link>
        )}
        <Link href={verified ? "/" : "/agm"} className="block">
          <Button variant="ghost" fullWidth>
            {verified ? "Go to home" : "Browse AGMs"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
