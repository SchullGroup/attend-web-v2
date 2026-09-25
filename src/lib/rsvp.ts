import { parseApiDate } from "./utils";

export type RsvpBlockedReason = "disabled" | "cancelled" | "unavailable" | null;

export interface RsvpEligibility {
  allowed: boolean;
  reason: RsvpBlockedReason;
}

/**
 * Build a Date from the backend's split date + wall-clock time.
 *
 * Swagger types these as `date` ("2026-08-11") and "Start time of the event in HH:mm
 * 24-hour format" ΓÇö neither carries a zone, so they mean local time to whoever typed
 * them. parseApiDate() is the wrong tool: it stamps a naive timestamp as UTC, which is
 * correct for the genuine `date-time` fields (createdAt, requestTime) but shifts an event
 * start by the viewer's offset. In WAT that read a 12:40 AGM as 13:40, so the grace period
 * appeared to close at 14:10 instead of 13:10.
 */
export function parseEventStart(date?: string, startTime?: string): Date | null {
  if (!date) return null;
  // Some payloads carry a full ISO timestamp in startTime; that one does have a zone.
  if (startTime?.includes("T")) {
    const iso = parseApiDate(startTime);
    return isNaN(iso.getTime()) ? null : iso;
  }
  const [y, m, d] = date.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  const [hh = 0, mm = 0] = (startTime || "00:00").split(":").map(Number);
  const parsed = new Date(y, m - 1, d, hh, mm, 0, 0);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Statuses that mean there is genuinely nothing to RSVP to. Enumerating the refused statuses
 * rather than the accepted ones is deliberate: an unfamiliar status falls through to allowed
 * and lets the backend arbitrate, so a status we have not seen yet cannot silently block a
 * registration the server would have honoured.
 */
const NOT_PUBLIC = new Set(["DRAFT", "PENDING", "PENDING_APPROVAL", "REJECTED", "SUSPENDED"]);

/**
 * Whether the RSVP button should be offered.
 *
 * Product decision (2026-09-25): RSVP should be offered at any point of an event's life —
 * upcoming, live, or even after it's ended — not cut off by a clock-based window. This used to
 * enforce a 30-minute late-registration grace period after LIVE and block registration outright
 * once ENDED (see git history / docs/RSVP_LATE_REGISTRATION.md for that older rule); both of
 * those time/status checks are removed here.
 *
 * The backend has NOT been updated to match yet as of this change — it may still reject an
 * RSVP outside its own rules. This function only controls whether the button is OFFERED; a
 * live rejection still surfaces through the existing onError handling on the RSVP call itself
 * (see `doRsvp` in events/[id]/page.tsx), so the backend stays the actual source of truth while
 * the frontend just stops guessing a narrower window than may actually be enforced.
 *
 * What's left blocked is deliberately NOT about timing: an explicit `rsvpEnabled: false`, a
 * cancelled event (nothing scheduled to attend), or a status meaning the event was never
 * published in the first place. Those are organiser/admin decisions, not clock artifacts.
 */
export function getRsvpEligibility(
  event?: { status?: string; rsvpEnabled?: boolean },
): RsvpEligibility {
  if (!event) return { allowed: false, reason: "unavailable" };

  // Only an explicit false blocks. The field is optional on the participant payload, and a
  // missing value must not be read as "registration disabled".
  if (event.rsvpEnabled === false) return { allowed: false, reason: "disabled" };

  const status = (event.status || "").toUpperCase();
  if (status === "CANCELLED") return { allowed: false, reason: "cancelled" };
  if (NOT_PUBLIC.has(status)) return { allowed: false, reason: "unavailable" };

  return { allowed: true, reason: null };
}

/** The sentence shown in place of the RSVP button when registration is refused. */
export function rsvpBlockedMessage(reason: RsvpBlockedReason): string | null {
  switch (reason) {
    case "cancelled":
      return "This event has been cancelled.";
    case "disabled":
      return "This event is not accepting registrations.";
    case "unavailable":
      return "Registration is not open for this event.";
    default:
      return null;
  }
}

/**
 * Whether an event still belongs in a "current" section - as opposed to getRsvpEligibility
 * above, which decides whether the RSVP button works.
 *
 * Every "Upcoming" / "not ended" list in the app used to trust `status` alone: not ENDED, not
 * CANCELLED, nothing else. That is *right* for RSVP eligibility - the backend keeps accepting
 * registrations past an event's nominal start until someone changes its status, so a client-side
 * clock check would incorrectly block a still-open RSVP (see the comment above). It is *wrong*
 * for deciding which section a card sits in: if a status update never lands (nobody ever marks
 * an AGM LIVE or ENDED), the event's actual date can be days in the past while it still sits in
 * "Upcoming" - reported 2026-09-15.
 *
 * `excludeLive` matters because two different shapes of list exist in this app:
 *   - Strict Upcoming tabs that have their own separate Live section (Home, the AGM page's
 *     Upcoming tab) - pass `true`, so a LIVE event moves to its own section instead of double-
 *     counting here.
 *   - Merged "not ended" lists with no Live section of their own (search, Innovation, General,
 *     Launches, My/Saved Events) - pass `false` (the default), so a currently LIVE event stays
 *     regardless of its start time already being in the past. That IS what LIVE means; excluding
 *     it here would make an event vanish from the only list it appears in.
 */
export function isEventCurrent(
  event: { status?: string; date?: string; startTime?: string },
  { excludeLive = false }: { excludeLive?: boolean } = {},
  now: Date = new Date(),
): boolean {
  const status = (event.status || "").toUpperCase();
  if (status === "ENDED" || status === "CANCELLED") return false;
  if (status === "LIVE") return !excludeLive;

  const startsAt = parseEventStart(event.date, event.startTime);
  // Unparseable - fail open, the same convention getRsvpEligibility uses above: don't hide an
  // event over a missing or malformed field.
  if (!startsAt) return true;
  return startsAt.getTime() > now.getTime();
}

/**
 * Soonest-first. Events with no parseable start time sort last, not first - a missing date is
 * not evidence an event is happening soon.
 */
export function compareByStartAsc(
  a: { date?: string; startTime?: string },
  b: { date?: string; startTime?: string },
): number {
  const ta = parseEventStart(a.date, a.startTime)?.getTime();
  const tb = parseEventStart(b.date, b.startTime)?.getTime();
  if (ta == null && tb == null) return 0;
  if (ta == null) return 1;
  if (tb == null) return -1;
  return ta - tb;
}
