import { apiClient } from "@/lib/api-client";
import {
  KycStatusResponse,
  KycStep1Request,
  KycStep2Request,
  KycStep3Request,
  BvnSelfieRequest,
  BvnSelfieResponse,
  ApiResponse,
} from "@/types";

export const kycClient = {
  getStatus: async () => {
    const response = await apiClient.get<KycStatusResponse>(
      "/api/v1/participant/kyc",
    );
    return response.data;
  },

  // Step 1 ΓÇö BVN verification (v1: record BVN)
  step1: async (data: KycStep1Request) => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step1",
      data,
    );
    return response.data;
  },

  // Standalone BVN + selfie re-check via Dojah. Read-only ΓÇö saves nothing and changes
  // no KYC state, so it is deliberately NOT named step1: it runs after step 3 (liveness)
  // purely to confirm the fresh selfie matches the BVN on file.
  bvnSelfieCheck: async (data: BvnSelfieRequest) => {
    const response = await apiClient.post<BvnSelfieResponse>(
      "/api/v1/participant/kyc/bvn-selfie/v2",
      data,
    );
    return response.data;
  },

  // Step 2 ΓÇö submit CHN
  step2: async (data: KycStep2Request) => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step2",
      data,
    );
    return response.data;
  },

  // Step 2 ΓÇö skip CHN
  step2Skip: async () => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step2/skip",
    );
    return response.data;
  },

  // Step 3 ΓÇö liveness / selfie check
  step3: async (data: KycStep3Request) => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step3",
      data,
    );
    return response.data;
  },
};
