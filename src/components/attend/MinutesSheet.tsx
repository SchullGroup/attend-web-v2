"use client";
import { useRef, useState } from "react";
import { ArrowLeft, FileText, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetMinutes } from "@/api/agm/hooks";
import { useGetEvent } from "@/api/events/hooks";
import { Dialog } from "@/components/ui/Dialog";
import { formatDate, parseApiDate } from "@/lib/utils";
import { sanitizeMinutesHtml, normalizeMinutesContent } from "@/lib/rich-content";
import { downloadNodeAsPdf } from "@/lib/dom-to-pdf";

// Re-skinned to the figma-redesign flat design (AgmBackButton/AgmHero/AgmSubNav
// shell + flat cards + tracking-[-0.72px] title). OUR logic is preserved wholesale:
//   • PDF export stays a DOM snapshot via downloadNodeAsPdf (html2canvas-pro) —
//     NOT the old hand-built jsPDF that the figma branch still ships. The docRef
//     wraps the on-screen document, so the PDF is an exact snapshot of it.
//   • Minutes render as sanitized HTML (backend sends a Resolutions section as
//     markup since 2026-08-18), not plain text.
//   • Company branding (branding.logoUrl + organiser) and the registrar credit
//     are kept — figma dropped them; they're real data, re-skinned flat here.
//   • The picker gates on `hasRsvped ?? registered` (minutes access needs a real
//     RSVP, backend-confirmed) rather than `registered` alone.

export function MinutesSheet({
  eventId,
  open: isOpen,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {

  const { data, isLoading, error } = useGetMinutes(eventId);
  const minutes = data?.data ?? null;
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  // The minutes payload itself has no organiser field; the event detail already does
  // (same registerName-over-organizerName precedence used on /agm and /events/[id]).
  const { data: eventResp } = useGetEvent(eventId);
  const event = eventResp?.data;
  const organiser = event?.registerName || event?.organizerName || "";

  if (isLoading) {
    return (
      <Sheet onClose={onClose} isOpen={isOpen}>
        <div className="h-72 animate-pulse rounded-xl bg-foreground/[0.04]" />
      </Sheet>
    );
  }

  // 403 — not registered for this AGM.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) {
    return (
      <Sheet onClose={onClose} isOpen={isOpen}>
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You must be registered for this AGM to view its minutes.
        </div>
      </Sheet>
    );
  }

  // status:true with data:null → finalised minutes aren't published yet.
  if (!minutes) {
    return (
      <Sheet onClose={onClose} isOpen={isOpen}>
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
      </Sheet>
    );
  }

  const finalised = minutes.finalisedAt
    ? formatDate(parseApiDate(minutes.finalisedAt).toISOString())
    : "—";

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
    <Sheet
      onClose={onClose}
      isOpen={isOpen}
      footer={
        /* Pinned per Figma — the document scrolls underneath. Outside docRef, so it
           never lands in the PDF snapshot. */
        <Button size="lg" fullWidth onClick={downloadPdf} loading={downloading} disabled={downloading}>
          <Download className="h-4 w-4" /> Download minutes
        </Button>
      }
    >
      {/* docRef wraps the on-screen document → the PDF is an exact snapshot of it.
          The page hero is inside it on purpose, so the PDF carries the same title. */}
      <div ref={docRef} className="flex flex-col gap-6">
        {/* Figma's minutes hero — the organiser's mark, the meeting title, then the
            document label. Finalised date moves to the footer credit below. */}
        <div className="flex flex-col items-center gap-2 pb-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-foreground/[0.04]">
            {event?.branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.branding.logoUrl}
                alt=""
                className="h-full w-full object-contain p-1.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <FileText className="h-6 w-6 text-foreground/60" />
            )}
          </span>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
            {event?.title || organiser || "AGM minutes"}
          </h1>
          <p className="text-sm tracking-[-0.14px] text-foreground/60">Meeting minutes</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <div className="space-y-5 p-5">
          {/* Finalised minutes carry a "Resolutions" section as HTML (2026-08-18) —
              sanitized before render since this is backend-supplied markup going into
              dangerouslySetInnerHTML. The [&_x] rules give the common report elements
              (headings/lists/tables) real spacing without the Tailwind typography plugin. */}
          <div
            className="space-y-2 text-sm leading-relaxed text-foreground/80 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-foreground/60 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:font-semibold [&_table]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-foreground/[0.08] [&_td]:p-1.5 [&_th]:border [&_th]:border-foreground/[0.08] [&_th]:bg-foreground/[0.04] [&_th]:p-1.5 [&_hr]:my-3 [&_hr]:border-foreground/[0.08]"
            dangerouslySetInnerHTML={{ __html: sanitizeMinutesHtml(normalizeMinutesContent(minutes.content || "")) }}
          />

          {/* Registrar credit — small and quiet on purpose, an attribution line rather
              than competing with the company's own branding in the header. */}
          {event?.organizerName && (
            <div className="flex items-center gap-2 border-t border-foreground/[0.06] pt-4 text-xs text-foreground/60">
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
              <span>Registered by {event.organizerName} · Finalised {finalised}</span>
            </div>
          )}
        </div>
        </div>
      </div>

    </Sheet>
  );
}


// Sheet shell — Figma's right-anchored panel with the Download button pinned at the
// bottom, matching the receipt sheet.
function Sheet({
  children, onClose, isOpen, footer,
}: {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} side="right" footer={footer}>
      <div className="flex flex-col gap-6">
        <button
          onClick={onClose}
          aria-label="Back"
          data-pdf-hide
          className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        {children}
      </div>
    </Dialog>
  );
}
