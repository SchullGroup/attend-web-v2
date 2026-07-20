"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveRoom } from "@/components/attend/LiveRoom";

function LivePageInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  return <LiveRoom eventId={eventId} showBallot backHref="/agm" backLabel="Leave meeting" />;
}

export default function LivePage() {
  return (
    <Suspense>
      <LivePageInner />
    </Suspense>
  );
}
