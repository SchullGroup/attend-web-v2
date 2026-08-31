"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText, Download, Building2, ChevronRight, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { jsPDF } from "jspdf";
import { useGetMinutes } from "@/api/agm/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { AgmBackButton, AgmHero, AgmSubNav } from "@/components/attend/AgmSubNav";
import { formatDate, parseApiDate } from "@/lib/utils";

function MinutesInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const { data, isLoading, error } = useGetMinutes(eventId);
  const minutes = data?.data ?? null;

  // No event selected → let the user pick which AGM's minutes to read.
  if (!eventId) return <MinutesPicker />;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-72 animate-pulse rounded-xl bg-foreground/[0.04]" />
      </div>
    );
  }

  // 403 — not registered for this AGM.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) {
    return (
      <Shell>
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You must be registered for this AGM to view its minutes.
        </div>
      </Shell>
    );
  }

  // status:true with data:null → finalised minutes aren't published yet.
  if (!minutes) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/15 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
            <Clock className="h-6 w-6 text-foreground/50" />
          </span>
          <p className="text-sm font-medium tracking-[-0.14px] text-foreground">Minutes not published yet</p>
          <p className="max-w-sm text-sm text-foreground/60">
            {data?.message ||
              "The minutes for this meeting will appear here once the organiser has finalised them."}
          </p>
        </div>
      </Shell>
    );
  }

  const finalised = minutes.finalisedAt
    ? formatDate(parseApiDate(minutes.finalisedAt).toISOString())
    : "—";

  function downloadPdf() {
    if (!minutes) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    let y = 64;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("AGM Minutes", margin, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Finalised ${finalised}`, margin, y);
    doc.setTextColor(20);
    y += 28;

    doc.setFontSize(11);
    const lines = doc.splitTextToSize(minutes.content || "", pageW - margin * 2);
    lines.forEach((line: string) => {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 16;
    });

    doc.save(`agm-minutes-${minutes.eventId || eventId}.pdf`);
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-2 pb-2 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-8 w-8 text-primary" />
        </span>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">AGM minutes</h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">Finalised {finalised}</p>
      </div>

      <div className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
          {minutes.content}
        </p>
      </div>

      <Button size="lg" fullWidth onClick={downloadPdf}>
        <Download className="h-4 w-4" /> Download minutes
      </Button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <AgmBackButton href="/agm/minutes" label="All minutes" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">{children}</div>
    </div>
  );
}

function MinutesPicker() {
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  const agms = (data?.data?.events ?? []).filter(
    (e: EventListItem) => e.eventType === "AGM_EGM" && e.registered,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
        <span className="text-foreground">AGM</span>
        <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
        <span className="text-foreground/40">Minutes</span>
      </div>

      <AgmHero />
      <AgmSubNav active="minutes" />

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Minutes</h2>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Select an AGM to read its finalised minutes.
        </p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-foreground/50">Loading…</p>
      ) : agms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You aren&apos;t registered for any AGMs yet. Minutes appear here once an AGM
          you attended has been finalised.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {agms.map((e) => (
            <Link
              key={e.id}
              href={`/agm/minutes?eventId=${e.id}`}
              className="flex items-center gap-2.5 rounded-xl border border-foreground/[0.06] bg-white p-1.5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
            >
              <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-foreground/80">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(e.date)}
                </p>
              </div>
              <span className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-foreground/60">
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MinutesPage() {
  return (
    <Suspense>
      <MinutesInner />
    </Suspense>
  );
}
