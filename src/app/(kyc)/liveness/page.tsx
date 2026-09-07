import { VerifyIdentityRoute } from "@/components/attend/VerifyIdentityRoute";

// Thin wrapper. The face capture is stage 2 of VerifyIdentitySheet; landing here with the
// BVN already on file opens the sheet directly on that stage.
export default function LivenessPage() {
  return <VerifyIdentityRoute />;
}
