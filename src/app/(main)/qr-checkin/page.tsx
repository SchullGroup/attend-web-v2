"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Check-in is a modal over the event page now, per the QR frame — it is never its own screen.
// Rendering the sheet here left it floating over an empty page with a "Check-in" app bar, so
// this URL just forwards to the event with ?qr=1, which opens the same modal in context.
// Kept as a route because it's still linked from elsewhere and may be bookmarked.
function QrCheckinRedirect() {
  const router = useRouter();
  const eventId = useSearchParams().get("eventId") ?? "";

  useEffect(() => {
    if (eventId) router.replace(`/events/${eventId}?qr=1`);
  }, [eventId, router]);

  if (!eventId) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/60">
        Open this from an event to see your check-in code.
      </div>
    );
  }
  return null;
}

export default function QrCheckinPage() {
  return (
    <Suspense>
      <QrCheckinRedirect />
    </Suspense>
  );
}
