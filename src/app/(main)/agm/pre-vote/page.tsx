"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PreVoteSheet } from "@/components/attend/PreVoteSheet";

// The sheet normally opens in place on /events/[id], so the detail page stays visible
// behind it (Figma's frame). This route stays for direct links, the AGM hub and any
// bookmarked URL — same sheet, just without a detail page behind it. Closing returns
// to the event it belongs to.
function PreVoteRouteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  if (!eventId) return null;

  return (
    <PreVoteSheet
      eventId={eventId}
      open
      onClose={() => router.push(`/events/${eventId}`)}
    />
  );
}

export default function PreVotePage() {
  return (
    <Suspense>
      <PreVoteRouteInner />
    </Suspense>
  );
}
