"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Photo gallery</h1>
        <p className="text-sm text-muted-foreground">
          Highlights from recent launches, AGMs and conferences.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No photos have been published yet. Galleries appear here after events conclude.
      </div>
    </div>
  );
}
