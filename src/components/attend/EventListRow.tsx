"use client";
import Link from "next/link";
import { Clock, Bookmark, ChevronRight, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSaveEvent, useUnsaveEvent } from "@/api/events/hooks";
import type { EventListItem } from "@/types";
import { cn, formatDate } from "@/lib/utils";

// One list card, per Figma: thumbnail, title, "By:", the date/time line, a bookmark toggle
// top-right and a circular chevron bottom-right. Shared by the Launches and General lists,
// which the frames draw identically — it lived inside events/page.tsx until General needed
// the same treatment.
//
// It owns its own save/unsave mutations because those hooks bind the event id at call time,
// so they can't be looped over in the parent; a child component per row is the right shape.

// Deterministic pastel tile per organiser — matches Home's approach, used when an event has
// no artwork of its own.
const TILE_TINTS = ["#f9b6ff", "#8ba6ff", "#c3e1d0", "#dbe1c3", "#f6f6f6", "#e2e2e2"];
export function tileTint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return TILE_TINTS[h % TILE_TINTS.length];
}

export function fmtTime(startTime?: string) {
  if (!startTime) return "--";
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return startTime;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export function EventListRow({
  event: e,
  saved,
  fallbackIcon: FallbackIcon = CalendarDays,
}: {
  event: EventListItem;
  saved: boolean;
  /** Shown in the thumbnail tile when the event has no artwork. */
  fallbackIcon?: LucideIcon;
}) {
  const organiser = e.registerName || e.organizerName;
  const { mutate: save, isPending: saving } = useSaveEvent(e.id);
  const { mutate: unsave, isPending: unsaving } = useUnsaveEvent(e.id);
  const art = e.flyerUrl || e.bannerUrl || e.organizerLogo || null;

  return (
    <div className="relative flex gap-2.5 rounded-xl border border-foreground/6 bg-white p-1.5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]">
      <Link href={`/events/${e.id}`} className="flex min-w-0 flex-1 gap-2.5">
        <div
          className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
          style={{ backgroundColor: tileTint(organiser || e.title) }}
        >
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={art}
              alt=""
              className="h-full w-full object-cover"
              onError={(ev) => {
                (ev.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <FallbackIcon className="h-6 w-6 text-foreground/60" strokeWidth={1.75} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1 pr-16">
          <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
            {e.title}
          </p>
          <p className="flex items-center gap-1 text-xs text-foreground/60">
            <span>By:</span>
            <span className="truncate text-foreground/80">{organiser}</span>
          </p>
          {/* The frame also shows a "120 Registered" count on each row. The list endpoint
              doesn't return one — `registeredCount` exists on EventDetail only, not on
              EventListItem — so the row shows the date/time it can actually prove. */}
          <p className="flex items-center gap-1 text-xs text-foreground/80">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {formatDate(e.date)}, {fmtTime(e.startTime)}
          </p>
        </div>
      </Link>

      {/* Sits outside the Link so it toggles instead of navigating. */}
      <button
        type="button"
        onClick={() => (saved ? unsave() : save())}
        disabled={saving || unsaving}
        aria-label={saved ? "Remove bookmark" : "Bookmark event"}
        className="absolute right-3 top-3 text-foreground/40 transition-colors hover:text-foreground disabled:opacity-50"
      >
        <Bookmark className={cn("h-4 w-4", saved && "fill-foreground text-foreground")} />
      </button>

      <Link
        href={`/events/${e.id}`}
        aria-label={`Open ${e.title}`}
        className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-foreground/10 text-foreground/60 transition-colors hover:bg-foreground/4 hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
