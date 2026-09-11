import type { KycStatusData, KycStatusResponse } from "@/types";

/**
 * One derivation of "what does this KYC status mean", shared by every gate.
 *
 * Three places decide things from KYC state — the /agm route gate, the event detail page's
 * prompt, and the verification sheet's opening stage. They used to each compare
 * `kycStatus === "FULL_KYC"` inline, which is correct for *entitlement* but silently wrong for
 * deciding whether to **prompt**: it lumps "hasn't started" together with "already submitted,
 * waiting on an officer" and "declined by an officer".
 *
 * That distinction is the whole reason this file exists. See `kycActionable`.
 */

/**
 * The entitlement. Only FULL_KYC may vote, appoint a proxy, or join an AGM — every action gate
 * keeps using exactly this, and nothing below widens it.
 */
export function isKycFull(kyc?: KycStatusData): boolean {
  return kyc?.kycStatus === "FULL_KYC";
}

/** Submitted and sitting in the KYC-officer review queue. */
export function isKycUnderReview(kyc?: KycStatusData): boolean {
  return kyc?.kycStatus === "PENDING_REVIEW" || !!kyc?.pendingOfficerReview;
}

/** An officer declined it. `kyc.rejectionReason` carries the why, when the backend sends one. */
export function isKycDeclined(kyc?: KycStatusData): boolean {
  return kyc?.kycStatus === "REJECTED" || !!kyc?.rejected;
}

/**
 * True when opening the verification sheet can actually move the user forward — i.e. the form
 * has a point. NO_KYC / PENDING / BASIC_KYC qualify.
 *
 * PENDING_REVIEW and REJECTED do NOT: re-running BVN + selfie cannot make an officer approve
 * you. Auto-prompting those states is an infinite loop — the user is not FULL_KYC, so the gate
 * fires; they complete the form; they're still not FULL_KYC; the gate fires again. They get an
 * informational notice instead, which never re-opens itself.
 *
 * **Never use this for access control.** It is about whether to prompt, not about permission —
 * an unresolved status reads as actionable here (prompting is harmless) while `isKycFull` reads
 * as unverified (blocking is safe). Those two defaults are deliberately opposite.
 */
export function isKycActionable(kyc?: KycStatusData): boolean {
  return !isKycFull(kyc) && !isKycUnderReview(kyc) && !isKycDeclined(kyc);
}

/** Convenience for the common `kycResp?.data` unwrap. */
export function kycOf(resp?: KycStatusResponse): KycStatusData | undefined {
  return resp?.data;
}
