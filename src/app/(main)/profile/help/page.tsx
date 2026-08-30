"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ = [
  { q: "What is Attend?", a: "Attend is an enterprise events platform for AGMs, product launches, innovation challenges, and general corporate gatherings." },
  { q: "How do I verify my identity?", a: "From Home, complete the KYC flow which collects your BVN and CHN. Verification typically completes in under a minute." },
  { q: "Can I attend an AGM virtually?", a: "Yes. Hybrid and virtual AGMs let you join the live stream and vote on resolutions in real time once your KYC is verified." },
  { q: "How do I appoint a proxy?", a: "On the AGM page, tap Proxy and choose either the Chairman of the meeting or a named proxy. You must submit the form before the meeting begins." },
  { q: "How are hackathon submissions judged?", a: "Submissions are evaluated by a panel of industry judges on innovation, technical depth, market fit and presentation quality." },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          aria-label="Back to settings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-white text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-foreground/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Help & FAQ</h1>
          <p className="text-sm tracking-[-0.14px] text-foreground/60">
            Answers to the most common questions.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-foreground/[0.06] overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {FAQ.map((f, i) => {
          const expanded = open === i;
          return (
            <li key={i}>
              <button
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium tracking-[-0.14px] text-foreground">{f.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-foreground/40 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              {expanded && (
                <div className="px-5 pb-4 text-sm text-foreground/60">{f.a}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <a
          href="mailto:hello@experienceattend.com"
          className="flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/70">
              <Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium tracking-[-0.14px] text-foreground">Email us</p>
              <p className="text-xs text-foreground/60">hello@experienceattend.com</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
        </a>
        <a
          href="tel:0800MERISTEM"
          className="flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/70">
              <Phone className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium tracking-[-0.14px] text-foreground">Call us</p>
              <p className="text-xs text-foreground/60">0800MERISTEM</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
        </a>
      </div>
    </div>
  );
}
