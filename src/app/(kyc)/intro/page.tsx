import { VerifyIdentityRoute } from "@/components/attend/VerifyIdentityRoute";

// Thin wrapper — the entry point Profile, Home, the onboarding checklist and the AGM gate
// all link to. The old explainer page it used to render is gone with the wizard; the sheet
// opens straight away and resumes at whichever stage the backend says is outstanding.
export default function KycIntroPage() {
  return <VerifyIdentityRoute />;
}
