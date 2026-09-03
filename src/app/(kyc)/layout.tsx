"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { KycStepDetail } from "@/types";

const STEPS = [
  { key: "bvn",      label: "BVN",   path: "/bvn",      n: 1 },
  { key: "chn",      label: "CHN",   path: "/chn",      n: 2 },
  { key: "liveness", label: "Face",  path: "/liveness", n: 3 },
];

export default function KycLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIntro   = pathname?.endsWith("/intro");
  const isSuccess = pathname?.endsWith("/success");

  // Which page you're on says where you are; only the backend says how far you've got.
  // Progress is read from the API so a resumed session shows real completion instead of
  // restarting the bar at step 1 — the URL alone can't tell those two cases apart.
  const { data } = useGetKycStatus();
  const kyc = data?.data;
  const settled = (s?: KycStepDetail) => !!(s?.completed || s?.skipped || s?.pendingReview);
  const stepDone = [kyc?.steps?.step1, kyc?.steps?.step2, kyc?.steps?.step3].map(settled);

  const currentIndex = STEPS.findIndex((s) => pathname?.endsWith(s.path));
  const doneCount = stepDone.filter(Boolean).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-foreground/[0.02]">
      {/* Header */}
      <header className="border-b border-foreground/[0.06] bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex flex-col gap-0.5">
            <img src="/attend-logo.png" alt="Attend" style={{ height: 36, width: "auto" }} />
            <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/60">
              Identity Verification
            </p>
          </div>
          <Link href="/" className="text-sm text-foreground/60 transition-colors hover:text-foreground">
            Skip for now
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        {/* Step indicator — only on BVN / CHN / Face pages */}
        {!isIntro && !isSuccess && (
          <div className="mb-8">
            {/* Progress label */}
            <div className="mb-4 flex items-center justify-between text-xs font-medium text-foreground/60">
              <span>Step {currentIndex + 1} of {STEPS.length}</span>
              <span>{pct}% complete</span>
            </div>

            {/* Step bubbles + connectors */}
            <div className="flex items-center">
              {STEPS.map((s, i) => {
                // "Done" comes from the backend, not from being earlier in the URL order —
                // step 2 is skippable, so position alone would mark a skipped step as
                // incomplete on the way back through.
                const done   = stepDone[i];
                const active = i === currentIndex;
                return (
                  <Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                          done   && "border-foreground bg-foreground text-white",
                          active && "border-foreground bg-white text-foreground",
                          !done && !active && "border-foreground/15 bg-white text-foreground/40",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : s.n}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          active ? "text-foreground" : "text-foreground/60",
                        )}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Connector — between steps only */}
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mx-4 mb-6 h-0.5 flex-1 rounded-full transition-colors",
                          done ? "bg-foreground" : "bg-foreground/15",
                        )}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Page card */}
        <div className="rounded-xl border border-foreground/[0.06] bg-white p-8 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
          {children}
        </div>
      </main>
    </div>
  );
}
