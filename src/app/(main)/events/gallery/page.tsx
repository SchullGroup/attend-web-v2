"use client";
import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

export default function GalleryPage() {
  const goBack = useGoBack("/events");
  return (
    <div className="flex flex-col gap-6">
      <button onClick={goBack} className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Photo gallery</h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Highlights from recent launches, AGMs and conferences.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
        No photos have been published yet. Galleries appear here after events conclude.
      </div>
    </div>
  );
}
