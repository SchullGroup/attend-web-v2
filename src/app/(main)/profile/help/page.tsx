"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Mail, MessageCircle } from "lucide-react";
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
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Help & FAQ</h1>
        <p className="text-sm text-muted-foreground">
          Answers to the most common questions.
        </p>
      </header>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {FAQ.map((f, i) => {
          const expanded = open === i;
          return (
            <li key={i}>
              <button
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              {expanded && (
                <div className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="grid gap-3 md:grid-cols-2">
        <a href="mailto:support@attend.io" className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Email support</p>
            <p className="text-xs text-muted-foreground">support@attend.io</p>
          </div>
        </a>
        <a href="mailto:support@attend.io?subject=Live%20Chat%20Request" className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Live chat</p>
            <p className="text-xs text-muted-foreground">Mon–Fri, 9:00 – 17:00 WAT</p>
          </div>
        </a>
      </section>
    </div>
  );
}
