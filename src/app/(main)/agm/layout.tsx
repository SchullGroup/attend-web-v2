"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useUserStore } from "@/lib/user-store";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { VerifyIdentitySheet } from "@/components/attend/VerifyIdentitySheet";

export default function AgmLayout({ children }: { children: React.ReactNode }) {
  const { kycStatus } = useUserStore();
  const session = useSession();
  const [verifyOpen, setVerifyOpen] = useState(false);

  // KYC gates voting and proxy appointment, which require a verified shareholder. A guest
  // can do neither — they're view-only — and has no KYC record to complete, so this gate
  // was a dead end for them. Middleware already limits guests to /agm/live, so skipping it
  // here only ever grants the live room they were invited to.
  const isGuest = session.type === "GUEST";

  // The store's kycStatus is seeded from localStorage as "none" and only becomes real once
  // NavShell has synced it, which on a cold load straight onto /agm briefly shows this gate
  // to people who are already verified. Reading the query too lets a resolved FULL_KYC
  // unblock immediately. It can only ever *unblock* — an unresolved query still gates, so
  // this stays fail-closed.
  const { data: kycResp } = useGetKycStatus(!session.loading && !isGuest);
  const kycFull = kycStatus === "full" || kycResp?.data?.kycStatus === "FULL_KYC";

  // Guest state lives in sessionStorage, which the server can't read — so on the server
  // and on the very first client render every visitor looks like a non-guest. Rendering
  // the gate then means shipping it in the SSR HTML and relying on hydration to take it
  // back. Wait until the session is resolved before deciding.
  if (session.loading) return null;

  if (!isGuest && !kycFull) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-sm space-y-6 px-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Identity verification required</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Complete your KYC to access Annual General Meetings, cast votes on resolutions, and appoint proxies.
            </p>
          </div>
          <div className="space-y-2">
            {/* Verification is one sheet now, so this backstop opens it in place rather than
                sending the user off to a separate wizard and losing where they were headed. */}
            <Button fullWidth onClick={() => setVerifyOpen(true)}>
              Start verification
            </Button>
            <Link href="/" className="block">
              <Button variant="ghost" fullWidth>Back to home</Button>
            </Link>
          </div>
        </div>

        {verifyOpen && (
          <VerifyIdentitySheet open onClose={() => setVerifyOpen(false)} />
        )}
      </div>
    );
  }

  return <>{children}</>;
}
