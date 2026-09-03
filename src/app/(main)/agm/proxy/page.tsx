"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProxySheet } from "@/components/attend/ProxySheet";

// The sheet normally opens in place on /events/[id] so the detail page stays visible
// behind it (Figma's frame). This route stays for direct links and the AGM hub — same
// sheet, closing back to the event it belongs to.
function ProxyRouteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  if (!eventId) return null;

  return (
    <ProxySheet
      eventId={eventId}
      open
      onClose={() => router.push(`/events/${eventId}`)}
    />
  );
}

export default function ProxyPage() {
  return (
    <Suspense>
      <ProxyRouteInner />
    </Suspense>
  );
}
