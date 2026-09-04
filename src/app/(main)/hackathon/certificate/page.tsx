"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificateSheet } from "@/components/attend/CertificateSheet";
import { useGoBack } from "@/hooks/useGoBack";

// Direct-link wrapper for the certificate sheet — the in-place trigger lives on
// /hackathon/my-applications, which stays visible behind it there. Hit cold, this
// route has no page behind it to dim; closing falls back to My Applications.
function CertificateRouteInner() {
  const challengeId = useSearchParams().get("challengeId") ?? "";
  const goBack = useGoBack("/hackathon/my-applications");

  return (
    <CertificateSheet
      challengeId={challengeId}
      open
      onClose={goBack}
    />
  );
}

export default function CertificatePage() {
  return (
    <Suspense>
      <CertificateRouteInner />
    </Suspense>
  );
}
