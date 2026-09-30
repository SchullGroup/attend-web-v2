"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelShell } from "./PanelShell";

// The only hardcoded support contacts in the app (the landing page carries social links only).
const SUPPORT_EMAIL = "support@experienceattend.com";
const SUPPORT_PHONE_LABEL = "+234 700 ATTEND";
// The vanity letters keypad-mapped, or `tel:` has nothing to dial:
// A=2 T=8 T=8 E=3 N=6 D=3 → 288363.
const SUPPORT_PHONE_TEL = "+234700288363";

const FAQ = [
  { q: "What is Attend?", a: "Attend is an enterprise events platform for AGMs, product launches, innovation challenges, and general corporate gatherings." },
  { q: "How do I verify my identity?", a: "From Home, complete the KYC flow which collects your BVN and CHN. Verification typically completes in under a minute." },
  { q: "Can I attend an AGM virtually?", a: "Yes. Hybrid and virtual AGMs let you join the live stream and vote on resolutions in real time once your KYC is verified." },
  { q: "How do I appoint a proxy?", a: "On the AGM page, tap Proxy and choose either the Chairman of the meeting or a named proxy. You must submit the form before the meeting begins." },
  { q: "How are hackathon submissions judged?", a: "Submissions are evaluated by a panel of industry judges on innovation, technical depth, market fit and presentation quality." },
];

export function HelpPanel({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <PanelShell title="Help & FAQ" onBack={onBack}>
      <p className="-mt-2 text-sm tracking-[-0.14px] text-foreground/60">
        Answers to the most common questions.
      </p>

      <ul className="divide-y divide-foreground/6 overflow-hidden rounded-xl border border-foreground/6 bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {FAQ.map((f, i) => {
          const expanded = open === i;
          return (
            <li key={i}>
              <button
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
              >
                <span className="text-sm font-medium tracking-[-0.14px] text-foreground">{f.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-foreground/40 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>
              {expanded && <div className="px-4 pb-4 text-sm text-foreground/60">{f.a}</div>}
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
