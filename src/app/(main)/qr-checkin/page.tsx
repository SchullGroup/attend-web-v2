"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useGetMyTicket, useGetEvent } from "@/api/events/hooks";
import { formatRelativeTime } from "@/lib/utils";

function QrCheckinInner() {
  const router = useRouter();
  const eventId = useSearchParams().get("eventId") ?? "";
  const { data: ticketResp, isLoading: ticketLoading } = useGetMyTicket(eventId);
  const ticket = ticketResp?.data;
  const { data: eventResp } = useGetEvent(eventId);
  const isVirtual = eventResp?.data?.format === "VIRTUAL";

  // Attendance is recorded by event staff scanning this code at the gate — there is no
  // self check-in. The flag is read-only here; it flips when the scan reaches the backend
  // and the poll in useGetMyTicket picks it up.
  const isCheckedIn = !!ticket?.checkedIn;
  const code = ticket?.qrToken || "";

  // QR check-in only applies to events with a physical venue (in-person / hybrid).
  if (isVirtual) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          QR check-in is only for in-person and hybrid events. This is a virtual event —
          just join the live session from the event page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Your check-in code</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          {ticket?.eventTitle
            ? `Show this code at the entrance for ${ticket.eventTitle}. A member of the event team will scan it to check you in.`
            : "Show this code at the entrance. A member of the event team will scan it to check you in."}
        </p>
      </header>

      <div className="mx-auto max-w-sm">
        <div className="rounded-xl border border-foreground/[0.06] bg-white p-6 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
          {isCheckedIn ? (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-600" />
              <p className="text-base font-semibold text-emerald-700">You&apos;re checked in</p>
              {ticket?.checkedInAt && (
                <p className="text-xs text-emerald-700/80">
                  Scanned {formatRelativeTime(ticket.checkedInAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="aspect-square w-full overflow-hidden rounded-xl border border-foreground/[0.06] bg-white p-3">
              {ticketLoading ? (
                <div className="h-full w-full animate-pulse rounded-lg bg-foreground/[0.04]" />
              ) : code ? (
                <div className="flex h-full w-full items-center justify-center">
                  <QRCodeSVG value={code} size={232} level="M" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xs text-foreground/60">
                  No ticket found for this event. RSVP first to get your code.
                </div>
              )}
            </div>
          )}

          <div className="mt-5 space-y-1 text-center">
            <p className="text-xs text-foreground/60">Check-in code</p>
            <p className="break-all text-sm font-semibold tracking-wider text-foreground">
              {code || "—"}
            </p>
            {ticket?.participantName && (
              <p className="text-xs text-foreground/60">{ticket.participantName}</p>
            )}
          </div>

          {/* Status, not an action. Nothing on this page can change it. */}
          {!isCheckedIn && code && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-foreground/[0.06] bg-foreground/[0.04] px-4 py-3 text-xs font-medium text-foreground/60">
              <Clock3 className="h-4 w-4 shrink-0" />
              Waiting for the event team to scan
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-foreground/60">
          {eventId
            ? "Only event staff can check you in. Keep this screen open at the entrance."
            : "Open this from an event to see your check-in code."}
        </p>
      </div>
    </div>
  );
}

export default function QrCheckinPage() {
  return (
    <Suspense>
      <QrCheckinInner />
    </Suspense>
  );
}
