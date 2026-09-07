import type { EventListItem } from "@/types";

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
 */
export function filterEventsByTab(events: EventListItem[], tab: EventTab): EventListItem[] {
  if (tab === "Attended") {
    return events.filter((e) => e.status === "ENDED" && (e.hasRsvped ?? e.registered));
  }

  const live = events.filter((e) => e.status !== "ENDED");
  if (tab === "RSVPs") return live.filter((e) => e.hasRsvped ?? e.registered);
  if (tab === "Challenges") return live.filter(isChallenge);
  return live;
}
