"use client";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Download, Building2, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetMinutes } from "@/api/agm/hooks";
import { useGetEvents, useGetEvent } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { formatDate, parseApiDate } from "@/lib/utils";
import { sanitizeMinutesHtml, normalizeMinutesContent } from "@/lib/rich-content";
import { downloadNodeAsPdf } from "@/lib/dom-to-pdf";

function MinutesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const { data, isLoading, error } = useGetMinutes(eventId);
  const minutes = data?.data ?? null;
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  // The minutes payload itself has no organiser field; the event detail already does
  // (same registerName-over-organizerName precedence used on /agm and /events/[id]).
  const { data: eventResp } = useGetEvent(eventId);
  const event = eventResp?.data;
  const organiser = event?.registerName || event?.organizerName || "";

  // No event selected ΓåÆ let the user pick which AGM's minutes to read.
  if (!eventId) return <MinutesPicker />;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-muted" />
      </div>
    );
  }

  // 403 ΓÇö not registered for this AGM.
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

  // status:true with data:null ΓåÆ finalised minutes aren't published yet.
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
    : "ΓÇö";

  async function downloadPdf() {
    if (!minutes || !docRef.current) return;
    setDownloading(true);
    try {
      await downloadNodeAsPdf(
        docRef.current,
        `agm-minutes-${minutes.eventId || eventId}.pdf`,
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Shell>
      <div ref={docRef} className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-linear-to-br from-emerald-500 to-emerald-700 p-6 text-white">
          <div className="flex items-center gap-3">
            {/* Company's own logo (branding.logoUrl) when set ΓÇö falls back to the generic
                document icon rather than showing a broken image. Distinct from the
                registrar's logo credited below the content (see organizerLogo there). */}
            {event?.branding?.logoUrl ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.branding.logoUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <FileText className="h-6 w-6" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-white/80">AGM minutes</p>
              <h1 className="text-lg font-bold">{organiser || "Finalised " + finalised}</h1>
              {organiser && <p className="text-xs text-white/80">Finalised {finalised}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Finalised minutes now carry a "Resolutions" section as HTML (2026-08-18) ΓÇö
              sanitized before render since this is backend-supplied markup, not a plain
              string, going into dangerouslySetInnerHTML. The [&_x] rules give the common
              report elements (headings/lists/tables) real spacing without pulling in the
              Tailwind typography plugin for one page. */}
          <div
            className="space-y-2 text-sm leading-relaxed text-foreground/90 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-muted-foreground [&_p]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:font-semibold [&_table]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-1.5 [&_hr]:my-3 [&_hr]:border-border"
            dangerouslySetInnerHTML={{ __html: sanitizeMinutesHtml(normalizeMinutesContent(minutes.content || "")) }}
          />

          {/* Registrar credit ΓÇö small and quiet on purpose, so it reads as an attribution
              line rather than competing with the company's own branding in the header. */}
          {event?.organizerName && (
            <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              {event.organizerLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.organizerLogo}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <span>Registered by {event.organizerName}</span>
            </div>
          )}

          <div data-pdf-hide className="flex flex-col gap-3 sm:flex-row">
            <Button fullWidth onClick={downloadPdf} loading={downloading} disabled={downloading}>
              <Download className="h-4 w-4" /> Download minutes
            </Button>
            <Link href="/agm/minutes" className="sm:flex-1">
              <Button variant="outline" fullWidth className="whitespace-nowrap">
                Back to Minutes List
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
  const router = useRouter();
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  // Minutes access itself gates on a real RSVP (backend confirmed, 2026-08-17), so the
  // picker should match ΓÇö `registered` alone includes shareholders who never actually
  // RSVP'd. Falls back to `registered` only until backend's `hasRsvped` field is live.
  const agms = (data?.data?.events ?? []).filter(
    (e: EventListItem) => e.eventType === "AGM_EGM" && (e.hasRsvped ?? e.registered),
  );

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
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
                    {e.startTime ? ` ┬╖ ${e.startTime}` : ""}
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
