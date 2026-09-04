import { VerifyIdentityRoute } from "@/components/attend/VerifyIdentityRoute";

// Thin wrapper. CHN has no field in the new flow (it was always optional and the frames
// don't show one) — it's settled with the skip endpoint inside VerifyIdentitySheet, so this
// URL now opens the same verification sheet as every other entry point.
export default function ChnPage() {
  return <VerifyIdentityRoute />;
}
