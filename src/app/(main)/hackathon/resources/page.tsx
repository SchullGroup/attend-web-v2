"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, PlayCircle } from "lucide-react";
import { useGetResources } from "@/api/hackathon/hooks";

interface ResourceRow {
  id: string;
  isVideo: boolean;
  isFile: boolean;
  title: string;
  description: string;
  url: string;
  meta: string;
}

function ResourcesInner() {
  const challengeId = useSearchParams().get("challengeId") ?? "";
  const { data, isLoading } = useGetResources(challengeId);
  const apiResources = data?.data ?? [];

  const resources: ResourceRow[] = apiResources.map((r) => {
    const isVideo = `${r.resourceType} ${r.fileType}`.toLowerCase().includes("video");
    const isFile = r.resourceType === "FILE";
    const sizeLabel = isFile && r.sizeBytes > 0 ? `${(r.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "";
    const typeLabel = r.category || r.fileType || (isFile ? "File" : "Link");
    return {
      id: r.id,
      isVideo,
      isFile,
      title: r.title,
      description: r.description,
      url: r.url,
      meta: [typeLabel, sizeLabel].filter(Boolean).join(" · "),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/hackathon" className="inline-flex w-fit items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Innovation
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Challenge Resources</h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Documentation, sample code, mentor sessions and submission templates.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-foreground/5" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground/50">
          No resources have been shared for this challenge yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {resources.map((r) => {
            const Icon = r.isVideo ? PlayCircle : FileText;
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 rounded-xl border border-foreground/[0.06] bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
              >
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-foreground/[0.04]">
                  <Icon className="h-5 w-5 text-foreground/60" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{r.title}</p>
                  <p className="truncate text-xs text-foreground/60">{r.description || r.meta}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-foreground/[0.04] px-4 py-2 text-xs font-semibold text-foreground">
                  {r.isFile ? "Download" : "Open"}
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
