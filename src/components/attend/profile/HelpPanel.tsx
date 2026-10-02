"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelShell } from "./PanelShell";
import { FAQ_SECTIONS, FAQ_TABS, type FaqSection } from "./faqs";

// The only hardcoded support contacts in the app (the landing page carries social links only).
const SUPPORT_EMAIL = "support@experienceattend.com";
const SUPPORT_PHONE_LABEL = "+234 700 ATTEND";
// The vanity letters keypad-mapped, or `tel:` has nothing to dial:
// A=2 T=8 T=8 E=3 N=6 D=3 → 288363.
const SUPPORT_PHONE_TEL = "+234700288363";

export function HelpPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<FaqSection>("AGM");
  const [open, setOpen] = useState<number | null>(0);
  const faqs = FAQ_SECTIONS[tab];

  return (
    <PanelShell
      title="Help & FAQ"
      onBack={onBack}
      tabs={FAQ_TABS}
      activeTab={tab}
      onTabChange={(t) => {
        setTab(t as FaqSection);
        setOpen(0);
      }}
    >
      <p className="-mt-2 text-sm tracking-[-0.14px] text-foreground/60">
        Answers to the most common questions.
      </p>

      <ul className="divide-y divide-foreground/6 overflow-hidden rounded-xl border border-foreground/6 bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {faqs.map((f, i) => {
          const expanded = open === i;
          return (
            <li key={f.q}>
              <button
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
              >
                <span className="min-w-0">
                  {/* Same light green as the active sidebar item (NavShell). */}
                  <span className="mb-1 inline-block rounded-full bg-[#e6f4ec] px-2 py-0.5 text-[11px] font-medium text-[#0A3D2E]">
                    {f.tag}
                  </span>
                  <span className="block text-sm font-medium tracking-[-0.14px] text-foreground">{f.q}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-foreground/40 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>
              {/* pre-line keeps the line breaks the FAQ sheets put inside step-by-step answers. */}
              {expanded && (
                <div className="whitespace-pre-line px-4 pb-4 text-sm text-foreground/60">{f.a}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-2">
        <ContactRow
          href={`mailto:${SUPPORT_EMAIL}`}
          icon={<Mail className="h-4 w-4" />}
          label="Email us"
          value={SUPPORT_EMAIL}
        />
        <ContactRow
          href={`tel:${SUPPORT_PHONE_TEL}`}
          icon={<Phone className="h-4 w-4" />}
          label="Call us"
          value={SUPPORT_PHONE_LABEL}
        />
      </section>
    </PanelShell>
  );
}

function ContactRow({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-foreground/6 bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-colors hover:bg-foreground/2"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-foreground/4 text-foreground/70">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium tracking-[-0.14px] text-foreground">{label}</span>
        <span className="block truncate text-xs text-foreground/60">{value}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
    </a>
  );
}
