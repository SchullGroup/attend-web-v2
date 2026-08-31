"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Figma's AGM section ("Web - Redesign", node 777:6462) presents AGMs / Proxy
// history / My receipts / Minutes as pill tabs sharing one "Annual General
// Meetings" hero — even though each is a separate route in this app. AgmHero
// renders the shared H1, AgmSubNav the pill row; both are only shown on the
// four "hub" pages (list/picker views), never on a drilled-into detail view.
const TABS = [
  { key: "agms", label: "AGMs", href: "/agm" },
  { key: "proxy-history", label: "Proxy history", href: "/agm/proxy-history" },
  { key: "receipts", label: "My receipts", href: "/agm/receipt" },
  { key: "minutes", label: "Minutes", href: "/agm/minutes" },
] as const;

export type AgmSubNavKey = (typeof TABS)[number]["key"];

export function AgmHero() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
        Annual General Meetings
      </h1>
      <p className="text-sm tracking-[-0.14px] text-foreground/60">
        View all your upcoming and live events your past AGMs histories
      </p>
    </div>
  );
}

export function AgmSubNav({ active }: { active: AgmSubNavKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "rounded-full px-4 py-2.5 text-sm tracking-[-0.14px] transition-colors",
            active === t.key
              ? "bg-foreground font-medium text-background"
              : "bg-foreground/[0.04] text-foreground/70 hover:bg-foreground/[0.08]",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

// Shared circular back button used on the "minimal chrome" sub-pages (proxy
// form, pre-vote, drilled-into receipt/minutes) — Figma shows an icon-only
// circular back control there instead of the hub pages' breadcrumb+tabs.
export function AgmBackButton({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-white text-foreground/70 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-[18px] w-[18px]" />
    </Link>
  );
}
