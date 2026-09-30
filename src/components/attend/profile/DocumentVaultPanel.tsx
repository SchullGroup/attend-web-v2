"use client";
import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useGetDocuments } from "@/api/documents/hooks";
import { documentsClient } from "@/api/documents/client";
import { useGetMyEvents } from "@/api/events/hooks";
import type { ParticipantDocument } from "@/types";
import { PanelShell, PanelEmpty, PanelSkeleton } from "./PanelShell";
import { attendedAgms as getAttendedAgms } from "./eventTabs";
import { MinutesDocRow, ReceiptDocRow } from "./AgmDocumentRows";
import { MinutesSheet } from "../MinutesSheet";
import { ReceiptSheet } from "../ReceiptSheet";

// Tabs per the frame. `documentType` is the only field to filter on, and the values the
// backend actually sends are unconfirmed — the previous page only ever matched
// notice/agenda/report/proxy. Certificates may therefore stay empty until the backend's
// vocabulary is known; matching is substring + case-insensitive so a "MEETING_MINUTES" or
// "certificate_of_attendance" still lands in the right tab.
//
// "Receipts" has no backend documentType at all — vote receipts are generated per
// participant (see AgmDocumentRows) rather than uploaded by the organiser, so this tab is
// entirely populated by the synthetic AGM rows below, never by `docs`.
const TABS = ["All", "Notices", "Agendas", "Minutes", "Receipts", "Certificates"] as const;
type Tab = (typeof TABS)[number];
type Category = Exclude<Tab, "All">;

// Order matters: the first keyword that matches wins, so a documentType carrying more than one
// (e.g. "meeting_notice_minutes") lands in exactly one tab. Filtering each tab independently
// with .includes() put that same document under both Notices and Minutes, where it read as two
// separate documents. Most specific first.
const CATEGORY_RULES: { category: Category; keyword: string }[] = [
  { category: "Certificates", keyword: "certificat" },
  { category: "Receipts", keyword: "receipt" },
  { category: "Minutes", keyword: "minute" },
  { category: "Agendas", keyword: "agenda" },
  { category: "Notices", keyword: "notice" },
];

function resolveCategory(documentType?: string): Category | null {
  const t = (documentType || "").toLowerCase();
  return CATEGORY_RULES.find((r) => t.includes(r.keyword))?.category ?? null;
}

/**
 * The name to show for a document.
 *
 * `title` is the admin's own name for it — required at upload and stored separately from the
 * filename, so it is always the field to display. It is only blank on rows saved before that was
 * enforced; those fall back to the filename minus its extension so no row renders nameless.
 */
function documentName(d: ParticipantDocument): string {
  const title = d.title?.trim();
  if (title) return title;
  const file = d.originalFilename?.trim();
  if (file) return file.replace(/\.[a-z0-9]{1,8}$/i, "");
  return "Untitled document";
}

export function DocumentVaultPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("All");
  const { data, isLoading } = useGetDocuments();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Which released minutes/receipt is open, if any — reuses the real sheets (and their
  // Download buttons) rather than re-deriving a PDF out of context. See AgmDocumentRows.
  const [openDoc, setOpenDoc] = useState<{ kind: "minutes" | "receipt"; eventId: string } | null>(null);

  const all = data?.data?.documents ?? [];
  const docs = tab === "All" ? all : all.filter((d) => resolveCategory(d.documentType) === tab);

  // Minutes and receipts for AGMs the participant actually attended — "attended" using the
  // same ended+RSVP'd rule the My Events "Attended" tab uses. Each candidate event renders a
  // MinutesDocRow/ReceiptDocRow that fetches its own content and hides itself if there's
  // nothing released yet, so an AGM with no minutes published doesn't show a dead row.
  const { data: myEventsResp } = useGetMyEvents();
  const attendedAgms = useMemo(
    () => getAttendedAgms(myEventsResp?.data?.events ?? []),
    [myEventsResp],
  );
  const showMinutesRows = tab === "All" || tab === "Minutes";
  const showReceiptRows = tab === "All" || tab === "Receipts";

  // Unchanged from the old /profile/documents page: goes through /documents/{id}/download so
  // the backend's counter actually increments — the row's own downloadUrl/fileUrl is a bare
  // Cloudinary/OBS link the backend never sees hit. Falls back to that same link if the
  // counted path fails (e.g. no CORS on the storage bucket) so a delivery problem never costs
  // the user the file itself.
  async function handleDownload(id: string, title: string, fallbackUrl: string) {
    if (downloadingId) return;
    setDownloadingId(id);
    try {
      const blob = await documentsClient.downloadDocument(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank");
      } else {
        window.alert(`Couldn't download "${title}". Please try again.`);
      }
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <PanelShell
      title="Document Vault"
      onBack={onBack}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as Tab)}
    >
      {isLoading ? (
        <PanelSkeleton />
      ) : docs.length === 0 && !((showMinutesRows || showReceiptRows) && attendedAgms.length > 0) ? (
        <PanelEmpty>
          {tab === "All"
            ? "No documents have been shared with you yet."
            : `No ${tab.toLowerCase()} have been shared with you yet.`}
        </PanelEmpty>
      ) : (
        <ul className="flex flex-col gap-2">
          {showMinutesRows &&
            attendedAgms.map((e) => (
              <MinutesDocRow
                key={`minutes-${e.id}`}
                eventId={e.id}
                eventTitle={e.title}
                onOpen={() => setOpenDoc({ kind: "minutes", eventId: e.id })}
              />
            ))}
          {showReceiptRows &&
            attendedAgms.map((e) => (
              <ReceiptDocRow
                key={`receipt-${e.id}`}
                eventId={e.id}
                eventTitle={e.title}
                onOpen={() => setOpenDoc({ kind: "receipt", eventId: e.id })}
              />
            ))}
          {docs.map((d) => {
            const title = documentName(d);
            // Field names differ between the spec and the deployed response; take whichever arrives.
            const organiser = d.eventTitle || d.eventName || "";
            const fallbackUrl = d.downloadUrl || d.fileUrl || "";
            const hasFile = !!fallbackUrl;

            return (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-foreground/6 bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-foreground/4 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                  Doc
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-[-0.14px] text-foreground">
                    {title}
                  </p>
                  {organiser && (
                    <p className="truncate text-xs text-foreground/60">By: {organiser}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => hasFile && handleDownload(d.id, title, fallbackUrl)}
                  // Every row is disabled while any download runs, not just the active one.
                  // Otherwise the other buttons stayed clickable but hit the re-entrancy guard
                  // and did nothing at all — no spinner, no error, no feedback.
                  disabled={!hasFile || downloadingId !== null}
                  aria-label={hasFile ? `Download ${title}` : "Download unavailable"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-foreground/25 disabled:hover:bg-transparent"
                >
                  {downloadingId === d.id ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Download className="h-[18px] w-[18px]" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openDoc?.kind === "minutes" && (
        <MinutesSheet eventId={openDoc.eventId} open onClose={() => setOpenDoc(null)} />
      )}
      {openDoc?.kind === "receipt" && (
        <ReceiptSheet eventId={openDoc.eventId} open onClose={() => setOpenDoc(null)} />
      )}
    </PanelShell>
  );
}
