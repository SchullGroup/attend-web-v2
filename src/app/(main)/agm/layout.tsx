"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { useGetEvent } from "@/api/events/hooks";
import Link from "next/link";
import { isKycFull } from "@/lib/kyc-gate";
import { VerifyIdentitySheet } from "@/components/attend/VerifyIdentitySheet";

// KYC used to be a WALL here: this layout replaced the whole `/agm` subtree with an "Identity
// verification required" interstitial, so an unverified shareholder could not even see that an
// AGM existed. Browsing is free everywhere now; verification is only ever demanded per action
// (RSVP, proxy, pre-vote, opening the Resolution tab — see events/[id]/page.tsx and
// components/attend/LiveRoom.tsx, both of which gate those actions themselves via useKycGate).
//
// This layout is now a backstop for the routes that ARE the action — see DIALOG_ROUTES below —
// and for the live room, `/agm/live`, which Home and pasted links reach directly, bypassing the
// detail page's own Join Live check (see LIVE_ROUTE). Every other /agm/* route is free to enter.

// Routes an unverified user may use freely. An ALLOWLIST of free routes, deliberately, rather
// than a blocklist of gated ones: a blocklist fails open for every route added later, and this
// segment is the wrong place to fail open.
//
// `/agm/proxy-history` is free on purpose. It's a history view whose list is necessarily empty
// for someone who has never been able to appoint a proxy, and its one action is revoking your
// OWN appointment — which somebody who was verified and is now under review (or was declined)
// must still be able to do. Gate that button in the page if it ever needs it, not the route.
//
// `/agm/live` is NOT free any more (2026-10-12). Joining an AGM needs verification — the event
// page's Join Live asks for it, and the FAQ says so — but a direct link to the live room (Home's
// "Live now" card, or a pasted /agm/live?eventId=… URL) skipped the event page and walked straight
// in. It's gated here now, whichever way the user arrives. Guests are still exempt (below).
const FREE_ROUTES = ["/agm", "/agm/minutes", "/agm/receipt", "/agm/proxy-history"];

// The live room isn't mounted at all until verification is confirmed: mounting it behind the
// sheet would start the Zoom join and the stream for an unverified user.
const LIVE_ROUTE = "/agm/live";

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
  const { data: kycResp, isError: kycError } = useGetKycStatus(gated && !session.loading && session.type === "SHAREHOLDER");

  // RSVP, as well as verification. The event page only offers Join Live to someone who has
  // RSVP'd, and the backend refuses an RSVP from someone who isn't on the AGM's register. A direct
  // /agm/live link skipped that, so a non-shareholder could walk in, see the resolutions and
  // vote (reported 2026-10-15). Same signal the event page uses: hasRsvped, falling back to
  // `registered` for older responses. Read from the URL in an effect (not useSearchParams, which
  // would force a Suspense boundary around every /agm page).
  // null until read from the URL; "" means the link carries no eventId at all.
  const [liveEventId, setLiveEventId] = useState<string | null>(null);
  useEffect(() => {
    setLiveEventId(
      pathname === LIVE_ROUTE ? new URLSearchParams(window.location.search).get("eventId") ?? "" : "",
    );
  }, [pathname]);
  const { data: liveEventResp, isError: liveEventError } = useGetEvent(
    liveEventId ?? "",
    pathname === LIVE_ROUTE && !isGuest && session.type === "SHAREHOLDER",
  );
  const liveEvent = liveEventResp?.data;
  const notRsvped = !!liveEvent && !(liveEvent.hasRsvped ?? liveEvent.registered);

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

  // The live room stays unmounted until we KNOW the user is verified: while the session or the
  // status is loading, if the check failed (fail closed), and whenever they aren't verified.
  const holdLiveRoom =
    pathname === LIVE_ROUTE &&
    !isGuest &&
    (session.loading ||
      session.type !== "SHAREHOLDER" ||
      !kycResp ||
      blocked ||
      !liveEvent ||
      notRsvped);
  const hideChildren = (open && DIALOG_ROUTES.includes(pathname)) || holdLiveRoom;

  return (
    <>
      {!hideChildren && children}

      {/* Shown in the live room's place while it's held back. After the sheet is closed
          (e.g. "under review"), this is what keeps the page from being blank. */}
      {holdLiveRoom && !open && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          {liveEventId === "" ? (
            <p className="max-w-sm text-sm text-foreground/60">
              This meeting link is incomplete. Open the meeting from the AGM list instead.
            </p>
          ) : kycError || liveEventError ? (
            <p className="max-w-sm text-sm text-foreground/60">
              We couldn't check your verification right now. Please refresh to try again.
            </p>
          ) : !kycResp || session.loading || (!blocked && !liveEvent) ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/15 border-t-foreground/60" />
          ) : !blocked && notRsvped ? (
            <>
              <p className="text-base font-medium tracking-[-0.32px] text-foreground">
                Confirm your attendance to join this meeting
              </p>
              <p className="max-w-sm text-sm text-foreground/60">
                Only shareholders who have RSVP'd can join a live AGM. You can RSVP from the
                meeting page.
              </p>
              <div className="mt-1 flex gap-2">
                <Link
                  href={`/events/${liveEventId}`}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
                >
                  Go to meeting page
                </Link>
                <button
                  type="button"
                  onClick={() => router.replace("/agm")}
                  className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium text-foreground"
                >
                  Back to AGMs
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-base font-medium tracking-[-0.32px] text-foreground">
                Verify your identity to join this meeting
              </p>
              <p className="max-w-sm text-sm text-foreground/60">
                Only verified shareholders can join a live AGM.
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
                >
                  Verify identity
                </button>
                <button
                  type="button"
                  onClick={() => router.replace("/agm")}
                  className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium text-foreground"
                >
                  Back to AGMs
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
