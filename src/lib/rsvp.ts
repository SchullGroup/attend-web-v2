import { parseApiDate } from "./utils";

/**
 * How long after an event starts a participant may still register.
 *
 * Product decision (PM, 2026-08-11): late arrivals get a 30-minute grace period to RSVP and
 * join. Documented in docs/Attend-web-user-flow-guide.html and docs/RSVP_LATE_REGISTRATION.md.
 *
 * This is the single source of truth on the frontend. The backend does not currently send a
 * window length ΓÇö if it ever does, read it from the event payload and fall back to this.
 */
export const LATE_RSVP_MINUTES = 30;

export type RsvpBlockedReason = "disabled" | "late" | "ended" | "unavailable" | null;

export interface RsvpEligibility {
  allowed: boolean;
  reason: RsvpBlockedReason;
  /** Set while a LIVE event is still inside its grace period. */
  lateWindowClosesAt: Date | null;
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
 * Statuses that close registration outright, whatever the clock says.
 *
 * Enumerating the refused statuses rather than the accepted ones is deliberate: an
 * unfamiliar status falls through to allowed and lets the backend arbitrate, so a status we
 * have not seen yet cannot silently block a registration the server would have honoured.
 */
const LIVE_STATUSES = new Set(["LIVE", "IN_PROGRESS", "ONGOING"]);
const FINISHED = new Set(["COMPLETED", "ENDED", "CLOSED", "CANCELLED", "ARCHIVED"]);
const NOT_PUBLIC = new Set(["DRAFT", "PENDING", "PENDING_APPROVAL", "REJECTED", "SUSPENDED"]);

/**
 * Whether the RSVP button should be offered.
 *
 * A LIVE event stays open for LATE_RSVP_MINUTES past its start time, then closes. Everything
 * else is decided by status alone ΓÇö notably NOT by the clock, so an event still PUBLISHED
 * after its nominal start keeps accepting registrations, which is what the backend does.
 *
 * The backend agrees on the rule as of 2026-08-11: `POST /participant/events/{id}/rsvp` accepts
 * "PUBLISHED or UPCOMING, or LIVE within 30 minutes of its scheduled start time". It measures
 * from the scheduled start too, so LATE_RSVP_MINUTES here and the server's window should shut at
 * the same moment ΓÇö see docs/RSVP_LATE_REGISTRATION.md ┬º4 for how that was confirmed.
 */
export function getRsvpEligibility(
  event?: { status?: string; rsvpEnabled?: boolean; date?: string; startTime?: string },
  now: Date = new Date(),
): RsvpEligibility {
  const closed = (reason: RsvpBlockedReason): RsvpEligibility => ({
    allowed: false,
    reason,
    lateWindowClosesAt: null,
  });

  if (!event) return closed("unavailable");

  // Only an explicit false blocks. The field is optional on the participant payload, and a
  // missing value must not be read as "registration disabled".
  if (event.rsvpEnabled === false) return closed("disabled");

  const status = (event.status || "").toUpperCase();
  if (FINISHED.has(status)) return closed("ended");
  if (NOT_PUBLIC.has(status)) return closed("unavailable");

  if (LIVE_STATUSES.has(status)) {
    const startsAt = parseEventStart(event.date, event.startTime);
    // No parseable start time means no way to measure the grace period. Stay open and let
    // the backend decide rather than locking out a participant over a missing field.
    if (!startsAt) return { allowed: true, reason: null, lateWindowClosesAt: null };

    const closesAt = new Date(startsAt.getTime() + LATE_RSVP_MINUTES * 60 * 1000);
    if (now > closesAt) return closed("late");
    return { allowed: true, reason: null, lateWindowClosesAt: closesAt };
  }

  return { allowed: true, reason: null, lateWindowClosesAt: null };
}

/** The sentence shown in place of the RSVP button when registration is refused. */
export function rsvpBlockedMessage(reason: RsvpBlockedReason): string | null {
  switch (reason) {
    case "late":
      return `Registration closed ${LATE_RSVP_MINUTES} minutes after this event started.`;
    case "ended":
      return "This event has ended.";
    case "disabled":
      return "This event is not accepting registrations.";
    case "unavailable":
      return "Registration is not open for this event.";
    default:
      return null;
  }
}

/** "13:10" - the local time the late-registration window shuts. */
export function formatWindowTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
