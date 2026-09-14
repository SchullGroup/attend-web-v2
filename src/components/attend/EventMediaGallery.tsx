"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LaunchMediaItem } from "@/types";

// Teaser images/videos, sat above the hero banner per the Figma reference — a compact strip,
// one item at a time, with dot paging. Distinct from EventBanner: that's the event's own
// artwork (flyer/logo/poster fallback chain); this is organiser-uploaded promo media and is
// simply absent (renders nothing) for an event with none.
export function EventMediaGallery({
  media,
  className,
}: {
  media: LaunchMediaItem[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  // Signed URLs are only ever populated on READY items — AWAITING_UPLOAD never reaches the
  // participant response, but a missing url is still checked defensively.
  const items = media.filter((m) => m.status === "READY" && m.url);
  const active = items[Math.min(index, items.length - 1)];
  if (!active) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative aspect-[649/193] w-full overflow-hidden rounded-2xl bg-foreground/5">
        {active.mediaType === "VIDEO" ? (
          <video
            key={active.id}
            src={active.url!}
            controls
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active.id}
            src={active.url!}
            alt={active.title || ""}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* One dot per item — each item IS a page here, unlike CardCarousel's per-screenful dots. */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Event media">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Media ${i + 1} of ${items.length}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-foreground" : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
