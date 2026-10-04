import type { GuestEventListItem } from "@/types";
import { guessEventTypeFromTitle } from "@/lib/event-type";
import { compareByStartAsc, compareLiveFirst } from "@/lib/rsvp";

// Shared by the two guest browse pages, /join (the login page's "Join as guest") and /guest
// (where an expired guest session lands). Both read GET /api/v1/guest/events through
// useGuestBrowseAllEvents and must list events the same way.

export type EventCategoryTab = "AGM" | "LAUNCH" | "GENERAL" | "INNOVATION" | "ALL";

export const GUEST_TABS: { id: EventCategoryTab; label: string }[] = [
  { id: "AGM", label: "AGMs" },
  { id: "LAUNCH", label: "Launches" },
  { id: "GENERAL", label: "General" },
  { id: "INNOVATION", label: "Innovation" },
  { id: "ALL", label: "All Events" },
];

// The backend's eventType values per tab. The guest list now carries eventType, so this is an
// exact match; the title guess below only covers an event that arrives without one.
const TAB_TYPES: Record<Exclude<EventCategoryTab, "ALL">, string[]> = {
  AGM: ["AGM_EGM", "AGM"],
  LAUNCH: ["PRODUCT_LAUNCH", "LAUNCH"],
  GENERAL: ["GENERAL_EVENT", "GENERAL"],
  INNOVATION: ["INNOVATION_CHALLENGE", "HACKATHON"],
};
const GUESSED_TAB: Record<string, EventCategoryTab> = {
  AGM: "AGM",
  Launch: "LAUNCH",
  Hackathon: "INNOVATION",
  Innovation: "INNOVATION",
};

function inTab(ev: GuestEventListItem, tab: EventCategoryTab): boolean {
  if (tab === "ALL") return true;
  if (ev.eventType) return TAB_TYPES[tab].includes(ev.eventType.toUpperCase());
  const guess = guessEventTypeFromTitle(ev.title);
  return (guess ? GUESSED_TAB[guess] : "GENERAL") === tab;
}

// YYYY-MM-DD in local time, to compare against the backend's date-only fields.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// How long after its last day an event stays listed. The guest list has no status (backend ask
// 2026-10-04), so we can't tell a LIVE event from an ended one. An AGM is often left LIVE for
// days after its date, and guests must still be able to find it, so recent events stay listed
// instead of disappearing the day after. Once the backend sends status, ENDED events go at once.
const RECENT_DAYS = 7;

function isListable(ev: GuestEventListItem, cutoff: string): boolean {
  const status = (ev.status || "").toUpperCase();
  if (status === "ENDED" || status === "CANCELLED" || status === "COMPLETED") return false;
  if (status === "LIVE") return true;
  const lastDay = (ev.endDate || ev.date || "").slice(0, 10);
  return !lastDay || lastDay >= cutoff;
}

// LIVE first (when the backend sends status). Then events that have already started — the only
// ones that can be live — most recent first, then upcoming events soonest first.
function compareForGuests(a: GuestEventListItem, b: GuestEventListItem, today: string): number {
  const live = compareLiveFirst(a, b);
  if (live) return live;
  const aStarted = (a.date || "").slice(0, 10) <= today;
  const bStarted = (b.date || "").slice(0, 10) <= today;
  if (aStarted !== bStarted) return aStarted ? -1 : 1;
  return aStarted ? compareByStartAsc(b, a) : compareByStartAsc(a, b);
}

/** The events for one tab: right type, not over, live/started first then upcoming. */
export function filterGuestEvents(
  events: GuestEventListItem[],
  tab: EventCategoryTab,
  now: Date = new Date(),
): GuestEventListItem[] {
  const today = dayKey(now);
  const cutoff = dayKey(new Date(now.getTime() - RECENT_DAYS * 86_400_000));
  return events
    .filter((ev) => inTab(ev, tab) && isListable(ev, cutoff))
    .sort((a, b) => compareForGuests(a, b, today));
}
