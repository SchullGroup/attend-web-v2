"use client";
import { use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Item B — Shareable-link entry point. Redirects `attend.ng/e/{eventId}?g={code}`
// to the guest redemption flow while preserving the eventId hint.

export default function GuestDeepLink({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const search = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const code = search.get("g");
    if (!code) {
      router.replace("/login");
      return;
    }
    router.replace(`/join/${encodeURIComponent(code)}?eventId=${encodeURIComponent(eventId)}`);
  }, [eventId, router, search]);
  return null;
}
