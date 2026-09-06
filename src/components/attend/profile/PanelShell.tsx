"use client";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared chrome for every Settings panel — the frames give each one a circular back arrow,
// a heading, and (on the three list panels) a row of underline tabs. The back arrow clears
// the ?section= param rather than navigating, since Settings is a single page.
export function PanelShell({
  title,
  onBack,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  title: string;
  onBack: () => void;
  tabs?: readonly string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 bg-white text-foreground/70 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-colors hover:bg-foreground/4 hover:text-foreground"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>

      <h1 className="text-xl font-medium tracking-[-0.6px] text-foreground">{title}</h1>

      {tabs && tabs.length > 0 && (
        <div className="flex gap-5 overflow-x-auto border-b border-foreground/8">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange?.(tab)}
              className={cn(
                "-mb-px shrink-0 border-b-2 pb-2.5 text-sm tracking-[-0.14px] transition-colors",
                tab === activeTab
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}

/** Dashed empty state, matching the treatment used across the app's list pages. */
export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
      {children}
    </div>
  );
}

/** Three pulsing row placeholders — the loading state every list panel shares. */
export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-[68px] animate-pulse rounded-xl bg-foreground/4" />
      ))}
    </div>
  );
}
