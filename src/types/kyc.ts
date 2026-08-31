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
   * persisted anywhere on the device ΓÇö storing a BVN in localStorage/sessionStorage
   * leaves it readable on shared machines long after the session ends.
   */
  bvn?: string;
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
// Read-only: it reports whether the pair matches and saves nothing ΓÇö it does NOT
// touch bvnVerified, kycStatus or currentStep. Not part of the 1-2-3 step flow.
export interface BvnSelfieRequest {
  bvn: string;
  /** Base64 JPEG with the `data:image/jpeg;base64,` prefix stripped. */
  selfieImage: string;
}

// A failed match is still HTTP 200 ΓÇö `valid` is the real result, not the status code.
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

export interface KycStep2Request {
  chn: string;
}

export interface KycStep3Request {
  // Raw base64 JPEG (no data: prefix). The backend derives the BVN from the
  // authenticated KYC record, so it isn't sent here.
  selfieImage: string;
}

export type KycStatusResponse = ApiResponse<KycStatusData>;
