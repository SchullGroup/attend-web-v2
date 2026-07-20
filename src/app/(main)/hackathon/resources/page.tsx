"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, PlayCircle, ExternalLink } from "lucide-react";
import { useGetResources } from "@/api/hackathon/hooks";

interface ResourceRow {
  id: string;
  isVideo: boolean;
  title: string;
  description: string;
  url: string;
}

function ResourcesInner() {
  const challengeId = useSearchParams().get("challengeId") ?? "";
  const { data, isLoading } = useGetResources(challengeId);
  const apiResources = data?.data ?? [];

  const resources: ResourceRow[] = apiResources.map((r) => ({
    id: r.id,
    isVideo: `${r.resourceType} ${r.fileType}`.toLowerCase().includes("video"),
    title: r.title,
    description: r.description,
    url: r.url,
  }));

  return (
    <div className="space-y-6">
      <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Innovation
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Hackathon resources</h1>
        <p className="text-sm text-muted-foreground">
          Documentation, sample code, mentor sessions and submission templates.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No resources have been shared for this challenge yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            const Icon = r.isVideo ? PlayCircle : FileText;
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${r.isVideo ? "bg-rose-50 text-rose-600" : "bg-purple-50 text-purple-600"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.isVideo ? "Video" : "Document"}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary">
                    {r.title}
                  </h3>
                  {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Open <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense>
      <ResourcesInner />
    </Suspense>
  );
}
