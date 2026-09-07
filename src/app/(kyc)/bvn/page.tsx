import { VerifyIdentityRoute } from "@/components/attend/VerifyIdentityRoute";

// Thin wrapper — the verification flow itself lives in VerifyIdentitySheet, shared with
// the AGM event page. See VerifyIdentityRoute for why these URLs are kept.
export default function BvnPage() {
  return <VerifyIdentityRoute />;
}
