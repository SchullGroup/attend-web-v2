"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, ScanLine, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { useCheckIn, useGetMyTicket, useGetEvent } from "@/api/events/hooks";

function QrCheckinInner() {
  const eventId = useSearchParams().get("eventId") ?? "";
  const { mutate: checkIn, isPending } = useCheckIn(eventId);
  const { data: ticketResp, isLoading: ticketLoading, refetch } = useGetMyTicket(eventId);
  const ticket = ticketResp?.data;
  const { data: eventResp } = useGetEvent(eventId);
  const isVirtual = eventResp?.data?.format === "VIRTUAL";

  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCheckedIn = justCheckedIn || !!ticket?.checkedIn;
  const code = ticket?.qrToken || "";

  // QR check-in only applies to events with a physical venue (in-person / hybrid).
  if (isVirtual) {
    return (
      <div className="space-y-6">
        <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          QR check-in is only for in-person and hybrid events. This is a virtual event —
          just join the live session from the event page.
        </div>
      </div>
    );
  }

  function doCheckIn() {
    if (!eventId) return;
    setErrorMsg(null);
    checkIn(undefined, {
      onSuccess: () => {
        setJustCheckedIn(true);
        refetch();
      },
      onError: (err: any) =>
        setErrorMsg(
          err?.response?.data?.message || err?.message || "Check-in failed. Please try again.",
        ),
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Quick check-in</h1>
        <p className="text-sm text-muted-foreground">
          {ticket?.eventTitle
            ? `Show this code at the entrance for ${ticket.eventTitle}, or check yourself in below.`
            : "Show this code at the entrance, or check yourself in below."}
        </p>
      </header>

      <div className="mx-auto max-w-sm">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          {isCheckedIn ? (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-600" />
              <p className="text-base font-semibold text-emerald-700">You&apos;re checked in</p>
            </div>
          ) : (
            <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-white p-3">
              {ticketLoading ? (
                <div className="h-full w-full animate-pulse rounded-xl bg-muted" />
              ) : code ? (
                <div className="flex h-full w-full items-center justify-center">
                  <QRCodeSVG value={code} size={232} level="M" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">
                  No ticket found for this event. RSVP first to get your code.
                </div>
              )}
            </div>
          )}

          <div className="mt-5 space-y-1 text-center">
            <p className="text-xs text-muted-foreground">Check-in code</p>
            <p className="break-all text-lg font-semibold tracking-wider text-foreground">
              {code || "—"}
            </p>
            {ticket?.participantName && (
              <p className="text-xs text-muted-foreground">{ticket.participantName}</p>
            )}
          </div>

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="mt-5">
            <Button
              fullWidth
              onClick={doCheckIn}
              loading={isPending}
              disabled={!eventId || isCheckedIn}
            >
              <ScanLine className="h-4 w-4" /> {isCheckedIn ? "Checked in" : "Check in"}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {eventId
            ? "Tap check in once you're at the venue."
            : "Open this from an event to enable check-in."}
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
