"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Download, Building2, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { jsPDF } from "jspdf";
import { useGetMinutes } from "@/api/agm/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
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
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-muted" />
      </div>
    );
  }

  // 403 — not registered for this AGM.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You must be registered for this AGM to view its minutes.
        </div>
      </Shell>
    );
  }

  // status:true with data:null → finalised minutes aren't published yet.
  if (!minutes) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Minutes not published yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
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
      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-linear-to-br from-emerald-500 to-emerald-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/80">AGM minutes</p>
              <h1 className="text-lg font-bold">Finalised {finalised}</h1>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {minutes.content}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button fullWidth onClick={downloadPdf}>
              <Download className="h-4 w-4" /> Download minutes
            </Button>
            <Link href="/agm" className="sm:flex-1">
              <Button variant="outline" fullWidth className="whitespace-nowrap">
                Back to AGMs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Link
        href="/agm/minutes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All minutes
      </Link>
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}

function MinutesPicker() {
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  const agms = (data?.data?.events ?? []).filter(
    (e: EventListItem) => e.eventType === "AGM_EGM" && e.registered,
  );

  return (
    <div className="space-y-6">
      <Link href="/agm" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to AGMs
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-foreground">Minutes</h1>
        <p className="text-sm text-muted-foreground">
          Select an AGM to read its finalised minutes.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : agms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You aren&apos;t registered for any AGMs yet. Minutes appear here once an AGM
          you attended has been finalised.
        </div>
      ) : (
        <ul className="space-y-3">
          {agms.map((e) => (
            <li key={e.id}>
              <Link
                href={`/agm/minutes?eventId=${e.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.date)}
                    {e.startTime ? ` · ${e.startTime}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
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
