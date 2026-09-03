"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
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
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Hackathon resources</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          Documentation, sample code, mentor sessions and submission templates.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
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
                className="group flex flex-col gap-3 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[10px] ${r.isVideo ? "bg-rose-50 text-rose-600" : "bg-purple-50 text-purple-600"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    {r.isVideo ? "Video" : "Document"}
                  </p>
                  <h3 className="mt-0.5 text-sm font-medium tracking-[-0.14px] text-foreground group-hover:text-primary">
                    {r.title}
                  </h3>
                  {r.description && <p className="mt-1 text-xs text-foreground/60">{r.description}</p>}
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
