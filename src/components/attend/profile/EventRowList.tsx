"use client";
import Link from "next/link";
import { ChevronRight, Bookmark } from "lucide-react";
import type { EventListItem } from "@/types";
import { useUnsaveEvent } from "@/api/events/hooks";
import { initialsFor } from "@/lib/utils";

// The frames render My Events and Saved Events as the same compact row: square artwork tile,
// title, "By: <organiser>", and a trailing control — a chevron on My Events, a filled green
// bookmark on Saved Events.
const MODULE_COLOR: Record<string, string> = {
  AGM: "#1a6b3c",
  AGM_EGM: "#1a6b3c",
  PRODUCT_LAUNCH: "#ea6c00",
  LAUNCH: "#ea6c00",
  HACKATHON: "#7c22c9",
  INNOVATION_CHALLENGE: "#7c22c9",
  GENERAL_EVENT: "#2563eb",
  GENERAL: "#2563eb",
};

// `useUnsaveEvent` is created per event id, so the bookmark control has to be its own
// component — calling the hook inside the row map would break the rules of hooks.
function UnsaveButton({ eventId, title }: { eventId: string; title: string }) {
  const { mutate: unsave, isPending } = useUnsaveEvent(eventId);
  return (
    <button
      type="button"
      onClick={() => unsave()}
      disabled={isPending}
      aria-label={`Remove ${title} from saved`}
      className="shrink-0 p-1 text-emerald-600 transition-opacity hover:opacity-70 disabled:opacity-40"
    >
      <Bookmark className="h-[18px] w-[18px] fill-emerald-600" />
    </button>
  );
}

export function EventRowList({
  events,
  trailing = "chevron",
}: {
  events: EventListItem[];
  trailing?: "chevron" | "bookmark";
}) {
  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => {
        const organiser = e.registerName || e.organizerName || "";
        const logo = e.branding?.logoUrl || e.organizerLogo || null;
        const tint =
          e.branding?.brandColor ||
          e.brandPrimary ||
          MODULE_COLOR[(e.eventType || "").toUpperCase()] ||
          "#2563eb";

        return (
          <li
            key={e.id}
            className="flex items-center gap-3 rounded-xl border border-foreground/6 bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
          >
            <Link href={`/events/${e.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] text-xs font-bold text-white"
                style={logo ? undefined : { background: tint }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsFor(organiser)
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-[-0.14px] text-foreground">
                  {e.title}
                </span>
                {organiser && (
                  <span className="block truncate text-xs text-foreground/60">By: {organiser}</span>
                )}
              </span>
            </Link>

            {trailing === "bookmark" ? (
              <UnsaveButton eventId={e.id} title={e.title} />
            ) : (
              <Link
                href={`/events/${e.id}`}
                aria-label={`Open ${e.title}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-foreground/50 transition-colors hover:bg-foreground/4 hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
