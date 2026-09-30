"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { useSession } from "@/hooks/useSession";
import { isKycDeclined, isKycFull, isKycUnderReview } from "@/lib/kyc-gate";
import { VerifyIdentitySheet } from "./VerifyIdentitySheet";
import { cn } from "@/lib/utils";

/**
 * The amber "Complete identity verification" nudge.
 *
 * Extracted from the Home page when verification moved to a prompt at the point of opening an
 * AGM — Home no longer mentions KYC at all. **Kept working and kept mounted at Profile** rather
 * than deleted, so re-enabling it on Home is uncommenting two lines (see the breadcrumb there).
 * Having a live consumer is deliberate: a parked component with no consumer rots silently, and
 * the revert would then be a broken one.
 *
 * It opens the verification sheet IN PLACE. It used to be a `<Link href="/intro">`, and that
 * route is gone — parking it with the link intact would have made this a landmine that only
 * fired whenever someone re-enabled it.
 *
 * Self-contained: it owns its own query and renders nothing when there's nothing to nudge, so a
 * host mounts it unconditionally and doesn't duplicate the condition.
 */
export function KycNudgeBanner({
  message = "Complete identity verification to vote in AGMs",
  className,
}: {
  message?: string;
  className?: string;
}) {
  const session = useSession();
  const [open, setOpen] = useState(false);

  // Gated on the query's resolved answer, NOT on `useUserStore().kycStatus`.
  //
  // That store seeds itself synchronously from localStorage in a lazy useState initializer, so
  // the server rendered "none" (nudge visible) while the client's very first render already
  // read "full" (nudge absent) — a hydration mismatch that made React discard and re-render the
  // whole tree. Waiting for a real response means both renders agree, and it also stops
  // trusting a cached value that `useLogout` used to leave behind (same root cause as the
  // /agm gate bypass fixed on 2026-09-06).
  const { data: kycResp } = useGetKycStatus(session.type === "SHAREHOLDER");
  const kyc = kycResp?.data;

  if (!kycResp || isKycFull(kyc)) return null;

  // A nudge is an invitation to act, so it says what acting means. "Complete verification" to
  // someone already in the officer queue is just wrong — the sheet they'd open shows a notice,
  // not a form, so the label has to match what they'll find.
  const label = isKycDeclined(kyc)
    ? "Your identity verification was declined — review and try again"
    : isKycUnderReview(kyc)
      ? "Your identity verification is under review"
      : message;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100",
          className,
        )}
      >
        <span>{label}</span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <VerifyIdentitySheet
          open
          onClose={() => setOpen(false)}
          // No enforcement here — a nudge the user declines just closes. Nothing to bounce to.
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
