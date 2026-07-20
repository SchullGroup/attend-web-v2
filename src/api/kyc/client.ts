import { apiClient } from "@/lib/api-client";
import {
  KycStatusResponse,
  KycStep1Request,
  KycStep2Request,
  KycStep3Request,
  ApiResponse,
} from "@/types";

export const kycClient = {
  getStatus: async () => {
    const response = await apiClient.get<KycStatusResponse>(
      "/api/v1/participant/kyc",
    );
    return response.data;
  },

  // Step 1 — BVN verification
  step1: async (data: KycStep1Request) => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step1",
      data,
    );
    return response.data;
  },

  // Step 2 — submit CHN
  step2: async (data: KycStep2Request) => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step2",
      data,
    );
    return response.data;
  },

  // Step 2 — skip CHN
  step2Skip: async () => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step2/skip",
    );
    return response.data;
  },

  // Step 3 — liveness / selfie check
  step3: async (data: KycStep3Request) => {
    const response = await apiClient.post<ApiResponse>(
      "/api/v1/participant/kyc/step3",
      data,
    );
    return response.data;
  },
};
