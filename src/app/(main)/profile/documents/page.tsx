"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useGetDocuments } from "@/api/documents/hooks";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  notice: "Notice",
  agenda: "Agenda",
  report: "Report",
  proxy: "Proxy form",
};

type Tab = "all" | "notice" | "agenda" | "report" | "proxy";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "notice", label: "Notices" },
  { key: "agenda", label: "Agendas" },
  { key: "report", label: "Reports" },
  { key: "proxy", label: "Proxy Forms" },
];

interface DocRow {
  id: string;
  typeKey: string;
  fileType: string;
  title: string;
  meta: string;
  eventTitle: string;
  downloadUrl: string;
}

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const { data, isLoading } = useGetDocuments();
  const apiDocs = data?.data?.documents ?? [];

  const docs: DocRow[] = useMemo(
    () =>
      apiDocs.map((d) => ({
        id: d.id,
        typeKey: (d.documentType || "").toLowerCase(),
        fileType: (d.fileType || "doc").replace(/^\./, ""),
        title: d.title,
        meta: d.downloadCount > 0 ? `${d.sizeLabel} · ${d.downloadCount} downloads` : d.sizeLabel,
        eventTitle: d.eventTitle,
        downloadUrl: d.downloadUrl,
      })),
    [apiDocs],
  );

  const visible = tab === "all" ? docs : docs.filter((d) => d.typeKey === tab);

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
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Document Vault</h1>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-foreground/10 px-4 md:-mx-8 md:px-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-6 py-2 text-sm tracking-[-0.14px] transition-colors",
              tab === t.key
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[68px] animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/10 p-10 text-center text-sm text-foreground/50">
          No documents have been shared with you yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04]">
                <span className="text-[10px] font-bold uppercase tracking-wide text-foreground/60">
                  {d.fileType.slice(0, 4)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{d.title}</p>
                <p className="truncate text-xs text-foreground/60">
                  {TYPE_LABEL[d.typeKey] || "Document"} · {d.meta}
                </p>
                {d.eventTitle && (
                  <p className="mt-0.5 truncate text-xs text-foreground/40">{d.eventTitle}</p>
                )}
              </div>
              {d.downloadUrl ? (
                <a
                  href={d.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${d.title}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] text-primary transition-colors hover:bg-foreground/[0.08]"
                >
                  <Download className="h-4 w-4" />
                </a>
              ) : (
                <button
                  disabled
                  aria-label="Download unavailable"
                  className="inline-flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/25"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
