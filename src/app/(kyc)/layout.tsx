"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "bvn",      label: "BVN",   path: "/bvn",      n: 1 },
  { key: "chn",      label: "CHN",   path: "/chn",      n: 2 },
  { key: "liveness", label: "Face",  path: "/liveness", n: 3 },
];

export default function KycLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIntro   = pathname?.endsWith("/intro");
  const isSuccess = pathname?.endsWith("/success");

  const currentIndex = STEPS.findIndex((s) => pathname?.endsWith(s.path));
  const pct = currentIndex >= 0 ? Math.round(((currentIndex + 1) / STEPS.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex flex-col gap-0.5">
            <img src="/attend-logo.png" alt="Attend" style={{ height: 36, width: "auto" }} />
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Identity Verification
            </p>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Skip for now
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        {/* Step indicator — only on BVN / CHN / Face pages */}
        {!isIntro && !isSuccess && (
          <div className="mb-8">
            {/* Progress label */}
            <div className="mb-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Step {currentIndex + 1} of {STEPS.length}</span>
              <span>{pct}% complete</span>
            </div>

            {/* Step bubbles + connectors */}
            <div className="flex items-center">
              {STEPS.map((s, i) => {
                const done   = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                          done   && "border-gray-900 bg-gray-900 text-white",
                          active && "border-gray-900 bg-white text-gray-900",
                          !done && !active && "border-border bg-white text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : s.n}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Connector — between steps only */}
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 mx-4 mb-6 rounded-full transition-colors",
                          done ? "bg-gray-900" : "bg-border",
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
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
