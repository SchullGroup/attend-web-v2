"use client";
import { CheckCircle2, Clock3, Clock, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useGetMyTicket, useGetEvent } from "@/api/events/hooks";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { formatDate, formatRelativeTime } from "@/lib/utils";

// Figma's QR Check-in frame: a centred modal over the page you're already on, rather than a
// trip to a separate screen. The standalone /qr-checkin route renders this same component, so
// the code and its states live in exactly one place.
//
// Attendance is recorded by event staff scanning this code at the gate — there is no self
// check-in. `checkedIn` is read-only here; it flips when the scan reaches the backend and the
// poll in useGetMyTicket picks it up.
export function QrCheckinSheet({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: ticketResp, isLoading: ticketLoading } = useGetMyTicket(eventId);
  const ticket = ticketResp?.data;
  const { data: eventResp } = useGetEvent(eventId);
  const event = eventResp?.data;

  const isVirtual = event?.format === "VIRTUAL";
  const isCheckedIn = !!ticket?.checkedIn;
  const code = ticket?.qrToken || "";
  const title = event?.title || ticket?.eventTitle || "";

  // QR check-in only applies to events with a physical venue (in-person / hybrid).
  if (isVirtual) {
    return (
      <Dialog open={open} onClose={onClose} className="max-w-[420px]">
        <DialogHeader title="QR Check-in" onClose={onClose} />
        <div className="rounded-xl border border-dashed border-foreground/15 p-8 text-center text-sm text-foreground/60">
          QR check-in is only for in-person and hybrid events. This is a virtual event — just
          join the live session from the event page.
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-[360px]">
      <DialogHeader
        title="QR Check-in"
        description="Present this QR code at the registration desk to confirm your attendance."
        onClose={onClose}
      />

      {/* Fixed 200px square rather than an aspect-square of the full panel width — the latter
          grew with the dialog and pushed the whole modal past the viewport, so it scrolled. */}
      <div className="rounded-2xl border border-foreground/6 bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {isCheckedIn ? (
          <div className="mx-auto flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">You&apos;re checked in</p>
            {ticket?.checkedInAt && (
              <p className="text-xs text-emerald-700/80">
                Scanned {formatRelativeTime(ticket.checkedInAt)}
              </p>
            )}
          </div>
        ) : ticketLoading ? (
          <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-xl bg-foreground/4" />
        ) : code ? (
          <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center">
            <QRCodeSVG value={code} size={200} level="M" />
          </div>
        ) : (
          <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-dashed border-foreground/15 px-4 text-center text-xs text-foreground/60">
            No ticket found for this event. RSVP first to get your check-in code.
          </div>
        )}
      </div>

      {/* Event line under the code, per the frame — so staff and attendee can both see at a
          glance which meeting this code belongs to. */}
      {(title || event?.date || event?.venue) && (
        <div className="mt-3 rounded-xl bg-foreground/3 p-4">
          {title && (
            <p className="text-sm font-semibold tracking-[-0.14px] text-foreground">{title}</p>
          )}
          <div className="mt-1.5 flex flex-col gap-1 text-xs tracking-[-0.12px] text-foreground/70">
            {event?.date && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {formatDate(event.date)}
                {event.startTime ? `, ${event.startTime}` : ""}
              </span>
            )}
            {event?.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {event.venue}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status, not an action — nothing here can change it. */}
      {!isCheckedIn && code && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-foreground/6 bg-foreground/4 px-4 py-3 text-xs font-medium text-foreground/60">
          <Clock3 className="h-4 w-4 shrink-0" />
          Waiting for the event team to scan
        </div>
      )}
    </Dialog>
  );
}
