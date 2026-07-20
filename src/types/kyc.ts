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
}

export interface KycStep2Request {
  chn: string;
}

export interface KycStep3Request {
  // Raw base64 JPEG (no data: prefix). The backend derives the BVN from the
  // authenticated KYC record, so it isn't sent here.
  selfieImage: string;
}

export type KycStatusResponse = ApiResponse<KycStatusData>;
