"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Fingerprint, FileCheck2, Lock } from "lucide-react";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { resumePath, completedStepCount } from "@/lib/kyc-progress";
import { KycStepDetail } from "@/types";

export default function KycIntroPage() {
  // Every "Continue verification" entry point in the app routes here, so this is where
  // resuming has to be decided. The backend already tracks which steps are settled —
  // send the user to the first one that isn't, rather than always restarting at BVN.
  const { data, isLoading } = useGetKycStatus();
  const kyc = data?.data;

  const nextPath = resumePath(kyc);
  const done = completedStepCount(kyc);
  const isResuming = done > 0;

  const stepState = (s?: KycStepDetail) => {
    if (s?.skipped) return { label: "Skipped", tone: "text-foreground/50" };
    if (s?.completed && s.pendingReview) return { label: "Under review", tone: "text-amber-600" };
    if (s?.completed) return { label: "Done", tone: "text-emerald-700" };
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          {isResuming ? "Continue your verification" : "Verify your identity"}
        </h1>
        <p className="mt-2 text-sm tracking-[-0.14px] text-foreground/60">
          {isResuming
            ? `You've completed ${done} of 3 steps. Pick up where you left off — nothing you've already submitted needs redoing.`
            : "To take part in AGMs and shareholder votes, we need to confirm a few details. This takes about 2 minutes."}
        </p>
      </div>

      <div className="space-y-3">
        {[
          { icon: Fingerprint, t: "BVN", d: "Your 11-digit Bank Verification Number", s: kyc?.steps?.step1 },
          { icon: Lock, t: "CHN (Optional)", d: "Your CSCS Clearing House Number — can be skipped and added later", s: kyc?.steps?.step2 },
          { icon: FileCheck2, t: "Liveness Check", d: "A quick face scan to confirm you are the account holder", s: kyc?.steps?.step3 },
        ].map(({ icon: Icon, t, d, s }) => {
          const state = stepState(s);
          return (
            <div
              key={t}
              className="flex items-start gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-3"
            >
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{s?.title || t}</p>
                  {state && (
                    <span className={`shrink-0 text-xs font-medium ${state.tone}`}>
                      {state.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/60">{d}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-foreground/60">
        Your information is encrypted and used solely to verify your eligibility for
        shareholder events. We never share your details with third parties.
      </p>

      <Link href={nextPath} className="block">
        <Button fullWidth size="lg" loading={isLoading} disabled={isLoading}>
          {isLoading ? "Checking your progress…" : isResuming ? "Continue verification" : "Begin verification"}
        </Button>
      </Link>
    </div>
  );
}
