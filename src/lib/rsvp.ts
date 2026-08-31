/**
 * Late-RSVP window computation.
 * Item A from ATTEND_UPDATE_SPEC_2026-07 — allows shareholders to RSVP up to
 * `lateRsvpMinutes` after the event start time (default 30, 0..120).
 */
export type RsvpWindow = {
  isOpen: boolean;
  closesAt: Date;
  minutesLeft: number;
  inLateWindow: boolean;
};

type EventLike = {
  startTime: string;
  lateRsvpMinutes?: number | null;
};

export function rsvpWindow(event: EventLike, nowMs = Date.now()): RsvpWindow {
  const start = new Date(event.startTime).getTime();
  const window = event.lateRsvpMinutes ?? 30;
  const cutoff = start + window * 60_000;
  const isOpen = nowMs <= cutoff;
  return {
    isOpen,
    closesAt: new Date(cutoff),
    minutesLeft: isOpen ? Math.max(0, Math.ceil((cutoff - nowMs) / 60_000)) : 0,
    inLateWindow: nowMs > start && isOpen,
  };
}
