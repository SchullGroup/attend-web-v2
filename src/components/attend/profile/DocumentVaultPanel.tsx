"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useGetDocuments } from "@/api/documents/hooks";
import { documentsClient } from "@/api/documents/client";
import type { ParticipantDocument } from "@/types";
import { PanelShell, PanelEmpty, PanelSkeleton } from "./PanelShell";

// Tabs per the frame. `documentType` is the only field to filter on, and the values the
// backend actually sends are unconfirmed — the previous page only ever matched
// notice/agenda/report/proxy. Minutes and Certificates may therefore stay empty until the
// backend's vocabulary is known; matching is substring + case-insensitive so a
// "MEETING_MINUTES" or "certificate_of_attendance" still lands in the right tab.
const TABS = ["All", "Notices", "Agendas", "Minutes", "Certificates"] as const;
type Tab = (typeof TABS)[number];

const TAB_MATCH: Record<Exclude<Tab, "All">, string> = {
  Notices: "notice",
  Agendas: "agenda",
  Minutes: "minute",
  Certificates: "certificat",
};

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

  const all = data?.data?.documents ?? [];
  const docs =
    tab === "All"
      ? all
      : all.filter((d) => (d.documentType || "").toLowerCase().includes(TAB_MATCH[tab]));

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
      ) : docs.length === 0 ? (
        <PanelEmpty>
          {tab === "All"
            ? "No documents have been shared with you yet."
            : `No ${tab.toLowerCase()} have been shared with you yet.`}
        </PanelEmpty>
      ) : (
        <ul className="flex flex-col gap-2">
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
                  disabled={!hasFile || downloadingId === d.id}
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
    </PanelShell>
  );
}
