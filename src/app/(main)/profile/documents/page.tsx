"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, FileBarChart2, FileCheck2, FileSignature, Loader2 } from "lucide-react";
import { useGetDocuments } from "@/api/documents/hooks";
import { documentsClient } from "@/api/documents/client";
import type { ParticipantDocument } from "@/types";

const TYPE_META: Record<string, { Icon: typeof FileText; bg: string; color: string; label: string }> = {
  notice: { Icon: FileText, bg: "bg-blue-50", color: "text-blue-700", label: "Notice" },
  agenda: { Icon: FileCheck2, bg: "bg-emerald-50", color: "text-emerald-700", label: "Agenda" },
  report: { Icon: FileBarChart2, bg: "bg-orange-50", color: "text-orange-700", label: "Report" },
  proxy: { Icon: FileSignature, bg: "bg-purple-50", color: "text-purple-700", label: "Proxy form" },
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

/** The spec sends only `sizeBytes`; the deployed response also sends a ready-made `sizeLabel`. */
function sizeLabel(d: ParticipantDocument): string {
  if (d.sizeLabel) return d.sizeLabel;
  if (!d.sizeBytes) return "";
  const kb = d.sizeBytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

interface DocRow {
  id: string;
  typeKey: string;
  title: string;
  meta: string;
  eventTitle: string;
  /** Whether the backend has a file stored for this row at all — not a link to it. */
  hasFile: boolean;
  /**
   * The row's own (uncounted) file link — only used as a fallback if the counted download
   * fails. The storage bucket the counted endpoint redirects to (Cloudinary/Huawei OBS)
   * doesn't send CORS headers, so a `fetch()` reading that response gets blocked by the
   * browser even though the request — and the backend's counter increment, which happens
   * before the redirect — already went through. Falling back here means the user still
   * gets their file either way; only the count is at risk of under-reporting on that path.
   */
  fallbackUrl: string;
}

export default function DocumentsPage() {
  const { data, isLoading } = useGetDocuments();
  const apiDocs = data?.data?.documents ?? [];
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const docs: DocRow[] = apiDocs.map((d) => {
    const size = sizeLabel(d);
    return {
      id: d.id,
      typeKey: (d.documentType || "").toLowerCase(),
      title: documentName(d),
      meta: d.downloadCount ? `${size} · ${d.downloadCount} downloads` : size,
      // Field names differ between the spec and the deployed response; take whichever arrives.
      eventTitle: d.eventTitle || d.eventName || "",
      hasFile: !!(d.downloadUrl || d.fileUrl),
      fallbackUrl: d.downloadUrl || d.fileUrl || "",
    };
  });

  // Goes through /documents/{id}/download so the backend's counter actually increments —
  // the row's own downloadUrl/fileUrl is a bare Cloudinary/OBS link the backend never sees
  // hit. Falls back to that same link if the counted path fails (e.g. no CORS on the
  // storage bucket) so a delivery problem never costs the user the file itself.
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
    <div className="flex flex-col gap-6">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">My documents</h1>
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
            Notices, agendas, reports and proxy forms attached to your events.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          No documents have been shared with you yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((d) => {
            const meta = TYPE_META[d.typeKey] || TYPE_META.notice;
            const { Icon } = meta;
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${meta.bg} ${meta.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{d.title}</p>
                  <p className="text-xs text-foreground/60">
                    {[meta.label, d.meta].filter(Boolean).join(" · ")}
                  </p>
                  {d.eventTitle && (
                    <p className="mt-0.5 truncate text-xs text-foreground/60">{d.eventTitle}</p>
                  )}
                </div>
                {d.hasFile ? (
                  <button
                    type="button"
                    onClick={() => handleDownload(d.id, d.title, d.fallbackUrl)}
                    disabled={downloadingId === d.id}
                    aria-label={`Download ${d.title}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-foreground/[0.06] bg-white text-foreground/60 transition-colors hover:bg-foreground/[0.04] hover:text-foreground disabled:opacity-50"
                  >
                    {downloadingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    aria-label="Download unavailable"
                    className="inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-[10px] border border-foreground/[0.06] bg-white text-foreground/30"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
