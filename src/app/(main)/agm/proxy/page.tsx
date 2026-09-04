"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProxySheet } from "@/components/attend/ProxySheet";
import { useGoBack } from "@/hooks/useGoBack";

// The sheet normally opens in place on /events/[id] so the detail page stays visible
// behind it (Figma's frame). This route stays for direct links and the AGM hub — same
// sheet, closing back to the event it belongs to.
function ProxyRouteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const goBack = useGoBack(`/events/${eventId}`);

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  if (!eventId) return null;

  return (
    <ProxySheet
      eventId={eventId}
      open
      onClose={goBack}
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
