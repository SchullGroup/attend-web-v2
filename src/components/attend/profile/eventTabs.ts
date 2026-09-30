import type { EventListItem } from "@/types";
import { isEventCurrent, compareByStartAsc } from "@/lib/rsvp";

// The frames give My Events and Saved Events the same four tabs.
export const EVENT_TABS = ["All", "Attended", "RSVPs", "Challenges"] as const;
export type EventTab = (typeof EVENT_TABS)[number];

const isChallenge = (e: EventListItem) =>
  ["HACKATHON", "INNOVATION_CHALLENGE"].includes((e.eventType || "").toUpperCase());

/**
 * Filter a list for one tab.
 *
 * "Attended" is the one tab that shows ENDED events, and the only place in the app that does
 * since the hide-ended-events pass — an attended event is a finished one by definition, so
 * hiding them here would leave the tab permanently empty.
 *
 * There is no `attended`/`checkedIn` flag on `EventListItem`, so attendance is approximated as
 * **ended + a real RSVP**. That over-counts a no-show who RSVP'd. Swap this for the real flag
 * when the backend exposes one.
 *
 * `includeEnded` opts out of the current-events-only filter below. My Events wants it off by
 * default — an ended RSVP belongs in Attended, not All/RSVPs/Challenges. Saved Events passes
 * `true`: a bookmark isn't about what's upcoming, and hiding a saved event once it ends made
 * the "N event(s) bookmarked" count on the profile page (a plain, unfiltered length) disagree
 * with what the panel actually showed — reported 2026-09-24 as "says 1 saved, shows none".
 */
export function filterEventsByTab(
  events: EventListItem[],
  tab: EventTab,
  { includeEnded = false }: { includeEnded?: boolean } = {},
): EventListItem[] {
  if (tab === "Attended") {
    return events.filter((e) => e.status === "ENDED" && (e.hasRsvped ?? e.registered));
  }

  // `isEventCurrent`, not a bare status check — something whose date has passed but was
  // never marked ENDED used to sit in All/RSVPs/Challenges indefinitely (2026-09-15). No
  // `excludeLive`: none of these three has a separate Live section, so a live event must
  // stay. Sorted soonest-first, since nothing else does.
  const pool = includeEnded ? events : events.filter((e) => isEventCurrent(e));
  const current = [...pool].sort(compareByStartAsc);
  if (tab === "RSVPs") return current.filter((e) => e.hasRsvped ?? e.registered);
  if (tab === "Challenges") return current.filter(isChallenge);
  return current;
}
