"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveRoom } from "@/components/attend/LiveRoom";

function EventLiveInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  // TEMP test override: ?zoomMn=<meetingNumber>&zoomPwd=<plainPasscode>
  const zoomMn = searchParams.get("zoomMn");
  const zoomOverride = zoomMn
    ? { meetingNumber: zoomMn, passcode: searchParams.get("zoomPwd") ?? "" }
    : undefined;
  return (
    <LiveRoom
      eventId={eventId}
      showBallot={false}
      backHref={`/events/${eventId}`}
      backLabel="Back to event"
      zoomOverride={zoomOverride}
    />
  );
}

export default function EventLivePage() {
  return (
    <Suspense>
      <EventLiveInner />
    </Suspense>
  );
}
