"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { isKycFull } from "@/lib/kyc-gate";
import { VerifyIdentitySheet } from "@/components/attend/VerifyIdentitySheet";

// KYC used to be a WALL here: this layout replaced the whole `/agm` subtree with an "Identity
// verification required" interstitial, so an unverified shareholder could not even see that an
// AGM existed. It's now a prompt over the page, and only on the routes that actually perform a
// privileged action.
//
// Browsing is free; acting is gated.
//
// The `/events/[id]` AGM detail page runs its own prompt (it lives outside this segment). This
// layout exists for the routes that can be reached WITHOUT passing through it — most importantly
// `/agm/live`, which the Home page links to directly for a LIVE AGM.

// Routes an unverified user may use freely. An ALLOWLIST of free routes, deliberately, rather
// than a blocklist of gated ones: a blocklist fails open for every route added later, and this
// segment is the wrong place to fail open.
//
// `/agm/proxy-history` is free on purpose. It's a history view whose list is necessarily empty
// for someone who has never been able to appoint a proxy, and its one action is revoking your
// OWN appointment — which somebody who was verified and is now under review (or was declined)
// must still be able to do. Gate that button in the page if it ever needs it, not the route.
const FREE_ROUTES = ["/agm", "/agm/minutes", "/agm/receipt", "/agm/proxy-history"];

// These two "pages" are themselves Dialogs (PreVoteSheet / ProxySheet). Rendering them under the
// gate stacks two portalled dialogs: two backdrops, and two document-level Escape handlers, so
// one keypress fires both this gate's navigation and the sheet's own goBack() — two competing
// navigations. They have no page content of their own to look at, so they're suppressed while
// the gate is up. `/agm/live` has real content and LiveRoom is not a Dialog, so it shows through.
const DIALOG_ROUTES = ["/agm/pre-vote", "/agm/proxy"];

export default function AgmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const session = useSession();

  // Guests are view-only and have no KYC record to complete, so the gate was a dead end for
  // them. Middleware already limits guests to /agm/live, so exempting them here only ever grants
  // the live room they were invited to. Note this reads the resolved session, NOT the
  // `?guest=true` query hint — a signed-in user could paste that to exempt themselves.
  const isGuest = session.type === "GUEST";
  const gated = !FREE_ROUTES.includes(pathname);

  // Only ask for a real signed-in account.
  //
  // `session.type === "SHAREHOLDER"` rather than `!isGuest` closes a fail-open: middleware
  // admits a request carrying only a refreshToken, and on that load `useSession` sees no
  // accessToken and reports ANONYMOUS. The old condition fired the query anyway, it 401'd, and
  // `retry: false` left it permanently errored with no data — which under this design means no
  // gate at all. Keying on SHAREHOLDER makes the query start on the false→true transition once
  // SessionBootstrap has minted the token.
  const { data: kycResp } = useGetKycStatus(gated && !session.loading && session.type === "SHAREHOLDER");

  // `!!kycResp`, never `isLoading`. A disabled React Query reports `isLoading: false` while
  // knowing nothing at all, so it can't tell "no answer yet" from "answered".
  const blocked = gated && !isGuest && !!kycResp && !isKycFull(kycResp.data);

  // An open LATCH, not derived state. If the sheet's visibility were computed straight from
  // `blocked`, then the instant the final step lands and the status flips to FULL_KYC the sheet
  // would unmount mid-flow — the user never sees the confirmation and `onVerified` never runs.
  // Same reasoning as the auto-open effect on the event detail page.
  const [open, setOpen] = useState(false);

  // Set once the user declines, to stop the effect immediately re-opening the sheet in the beat
  // before the navigation lands.
  const leaving = useRef(false);

  // Reset per route. This layout does NOT remount between `/agm/*` navigations, so without this
  // a decline on /agm/pre-vote would leave /agm/proxy ungated for the rest of the session.
  // Declared before the opener so it runs first on a pathname change.
  useEffect(() => {
    leaving.current = false;
  }, [pathname]);

  useEffect(() => {
    if (blocked && !leaving.current) setOpen(true);
  }, [blocked]);

  // On a gated route, dismissing and leaving are the same action — that's what makes this a gate
  // rather than decoration. The shared Dialog closes on Escape and on a backdrop click with no
  // way to opt out, so if dismissal left the user in place, one Escape would drop an unverified
  // user into a fully mounted live room. `replace`, never `push`: with `push` the Back button
  // returns to the gated route, re-opens the gate, and traps the user in a loop.
  function leave() {
    leaving.current = true;
    setOpen(false);
    router.replace("/agm");
  }

  const hideChildren = open && DIALOG_ROUTES.includes(pathname);

  return (
    <>
      {!hideChildren && children}

      {open && (
        <VerifyIdentitySheet
          open
          // Completing verification must not navigate — just close and let the page they were
          // already on become usable.
          onClose={() => setOpen(false)}
          onDismiss={leave}
          onVerified={() => setOpen(false)}
          dismissLabel="Back to AGMs"
        />
      )}
    </>
  );
}
