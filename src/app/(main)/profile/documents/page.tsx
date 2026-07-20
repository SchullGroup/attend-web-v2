"use client";
import Link from "next/link";
import { ArrowLeft, Download, FileText, FileBarChart2, FileCheck2, FileSignature } from "lucide-react";
import { useGetDocuments } from "@/api/documents/hooks";

const TYPE_META: Record<string, { Icon: typeof FileText; bg: string; color: string; label: string }> = {
  notice: { Icon: FileText, bg: "bg-blue-50", color: "text-blue-700", label: "Notice" },
  agenda: { Icon: FileCheck2, bg: "bg-emerald-50", color: "text-emerald-700", label: "Agenda" },
  report: { Icon: FileBarChart2, bg: "bg-orange-50", color: "text-orange-700", label: "Report" },
  proxy: { Icon: FileSignature, bg: "bg-purple-50", color: "text-purple-700", label: "Proxy form" },
};

interface DocRow {
  id: string;
  typeKey: string;
  title: string;
  meta: string;
  eventTitle: string;
  downloadUrl: string;
}

export default function DocumentsPage() {
  const { data, isLoading } = useGetDocuments();
  const apiDocs = data?.data?.documents ?? [];

  const docs: DocRow[] = apiDocs.map((d) => ({
    id: d.id,
    typeKey: (d.documentType || "").toLowerCase(),
    title: d.title,
    meta: d.downloadCount > 0 ? `${d.sizeLabel} · ${d.downloadCount} downloads` : d.sizeLabel,
    eventTitle: d.eventTitle,
    downloadUrl: d.downloadUrl,
  }));

  return (
    <div className="space-y-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My documents</h1>
          <p className="text-sm text-muted-foreground">
            Notices, agendas, reports and proxy forms attached to your events.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No documents have been shared with you yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => {
            const meta = TYPE_META[d.typeKey] || TYPE_META.notice;
            const { Icon } = meta;
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} · {d.meta}
                  </p>
                  {d.eventTitle && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.eventTitle}</p>
                  )}
                </div>
                {d.downloadUrl ? (
                  <a
                    href={d.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${d.title}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    disabled
                    aria-label="Download unavailable"
                    className="inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-white text-muted-foreground/40"
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
