import { ApiResponse } from "./api";

export type KycStatusValue =
  | "NO_KYC"
  | "PENDING"
  | "BASIC_KYC"
  | "PENDING_REVIEW"
  | "FULL_KYC"
  | "REJECTED";

export interface KycStepDetail {
  title: string;
  completed: boolean;
  optional: boolean;
  skipped: boolean;
  pendingReview: boolean;
}

export interface KycStatusData {
  kycStatus: KycStatusValue;
  kycComplete: boolean;
  pendingOfficerReview: boolean;
  rejected: boolean;
  rejectionReason?: string;
  currentStep: number;
  /**
   * The verified BVN, returned by the backend once step 1 is on file.
   *
   * This is the only place the client should obtain a BVN. It is deliberately NOT
   * persisted anywhere on the device — storing a BVN in localStorage/sessionStorage
   * leaves it readable on shared machines long after the session ends.
   */
  bvn?: string;
  /**
   * NIN — the gate in front of Innovation and Launch RSVPs. Not identity verification, and it
   * never touches `kycStatus` or the BVN steps below.
   *
   * Two backend steps: `POST /kyc/nin` (a lookup) sets `ninSubmitted`; only `POST
   * /kyc/nin-selfie` (a face match) sets `ninVerified`. Gate on `ninVerified` alone.
   */
  ninVerified?: boolean;
  ninSubmitted?: boolean;
  /** Echoed back only once verified — so a half-finished attempt has to re-enter the NIN. */
  nin?: string;
  steps: {
    step1: KycStepDetail;
    step2: KycStepDetail;
    step3: KycStepDetail;
  };
}

// Stepped KYC flow (backend split the old single submit into steps).
export interface KycStep1Request {
  bvn: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  consent?: boolean;
  hasConsent?: boolean;
  bvnConsent?: boolean;
  consentToBvnLookup?: boolean;
}

// Standalone BVN + selfie re-check (POST /participant/kyc/bvn-selfie/v2).
// Read-only: it reports whether the pair matches and saves nothing — it does NOT
// touch bvnVerified, kycStatus or currentStep. Not part of the 1-2-3 step flow.
export interface BvnSelfieRequest {
  bvn: string;
  /** Base64 JPEG with the `data:image/jpeg;base64,` prefix stripped. */
  selfieImage: string;
}

// A failed match is still HTTP 200 — `valid` is the real result, not the status code.
export interface BvnSelfieResult {
  valid: boolean;
  message?: string;
  confidenceValue?: number;
  // Only populated when valid is true.
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  gender?: string;
}

export type BvnSelfieResponse = ApiResponse<BvnSelfieResult>;

// NIN step 1 — lookup only (POST /participant/kyc/nin). Does NOT set `ninVerified`.
//
// `consent` is required (400 without it) and the backend timestamps it as an audit record, so
// it's only sent once the user has ticked the box on the NIN screen. `dob` is optional on the
// backend and deliberately not collected (user decision, 2026-09-14), nor are the name
// overrides — the account's own names are used for the match.
export interface NinSubmitRequest {
  nin: string;
  consent: boolean;
}

// NIN step 2 — face match (POST /participant/kyc/nin-selfie). A pass sets `ninVerified`.
// The NIN must equal the one submitted at step 1, or the backend returns 409.
export interface NinSelfieRequest {
  nin: string;
  /** Base64 JPEG with the `data:image/jpeg;base64,` prefix stripped. */
  selfieImage: string;
}

// A failed match is still HTTP 200 — `valid` is the real result, not the status code.
export interface NinSelfieResult {
  valid: boolean;
  message?: string;
  confidenceValue?: number;
}

export type NinSelfieResponse = ApiResponse<NinSelfieResult>;

export interface KycStep2Request {
  chn: string;
}

export interface KycStep3Request {
  // Raw base64 JPEG (no data: prefix). The backend derives the BVN from the
  // authenticated KYC record, so it isn't sent here.
  selfieImage: string;
}

export type KycStatusResponse = ApiResponse<KycStatusData>;
