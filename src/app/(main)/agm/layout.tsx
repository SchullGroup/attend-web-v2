"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { VerifyIdentitySheet } from "@/components/attend/VerifyIdentitySheet";

export default function AgmLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const [verifyOpen, setVerifyOpen] = useState(false);

  // KYC gates voting and proxy appointment, which require a verified shareholder. A guest
  // can do neither — they're view-only — and has no KYC record to complete, so this gate
  // was a dead end for them. Middleware already limits guests to /agm/live, so skipping it
  // here only ever grants the live room they were invited to.
  const isGuest = session.type === "GUEST";

  // Only the server's answer opens this gate.
  //
  // This used to also accept the store's `kycStatus === "full"`, to avoid flashing the gate at
  // verified users on a cold load. That wasn't fail-closed, despite the comment claiming it
  // was: the store seeds itself synchronously from localStorage["attend:demo:kyc"], which
  // useLogout never clears. So a verified user could log out, someone else could log in on the
  // same browser, and that second person was waved straight through on first render — before
  // their own KYC had been checked at all. Same hole kept access open for anyone whose KYC was
  // later revoked. The flash is now prevented by waiting on the query below instead, which
  // costs a beat of blank space and gives up nothing.
  const { data: kycResp, isLoading: kycLoading } = useGetKycStatus(!session.loading && !isGuest);
  const kycFull = kycResp?.data?.kycStatus === "FULL_KYC";

  // Guest state lives in sessionStorage, which the server can't read — so on the server
  // and on the very first client render every visitor looks like a non-guest. Rendering
  // the gate then means shipping it in the SSR HTML and relying on hydration to take it
  // back. Wait until the session is resolved before deciding.
  if (session.loading) return null;

  // Likewise, don't decide anything until the KYC answer is actually in — rendering either
  // branch on a pending query shows somebody the wrong screen.
  if (!isGuest && kycLoading) return null;

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
