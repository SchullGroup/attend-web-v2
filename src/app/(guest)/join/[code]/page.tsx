"use client";
import { use, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Legacy invite shape, kept only so old links don't dead-end.
//
// This page was built against three endpoints from the update spec that the backend never
// shipped — /guest/invites/{code}, /guest/redeem and /guest/session — so it 404'd for
// everyone who followed it. Its "capabilities" panel and name/email/phone/role capture had
// nowhere to go either: the real endpoint, POST /guest/events/{eventId}/join, takes a code
// and nothing else.
//
// Live invite links use /guest-join?eventId=…&code=… — the shape the backend documents when
// it mints a code. If this old link carried an eventId we can forward straight through;
// without one the code alone can't identify an event, and /guest-join sends them to browse.
function LegacyGuestJoinInner({ code }: { code: string }) {
  const router = useRouter();
  const eventId = useSearchParams().get("eventId") ?? "";

  useEffect(() => {
    const qs = new URLSearchParams({ code });
    if (eventId) qs.set("eventId", eventId);
    router.replace(`/guest-join?${qs.toString()}`);
  }, [code, eventId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}

export default function LegacyGuestJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <Suspense>
      <LegacyGuestJoinInner code={code} />
    </Suspense>
  );
}
