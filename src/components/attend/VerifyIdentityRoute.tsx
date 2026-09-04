"use client";
import { useRouter } from "next/navigation";
import { VerifyIdentitySheet } from "./VerifyIdentitySheet";
import { useGoBack } from "@/hooks/useGoBack";

// Host for the standalone verification URLs (/intro, /bvn, /chn, /liveness).
//
// The old full-page wizard those URLs pointed at is gone — there is now one verification
// flow, the modal one from the AGM frames — but the URLs are kept alive so every existing
// entry point (Profile, Home, the onboarding checklist, the AGM gate) and any bookmarked
// link still lands somewhere real. They all open the same sheet.
export function VerifyIdentityRoute() {
  const router = useRouter();
  const goBack = useGoBack("/");

  return (
    <VerifyIdentitySheet
      open
      onClose={goBack}
      onVerified={() => router.push("/success")}
    />
  );
}
