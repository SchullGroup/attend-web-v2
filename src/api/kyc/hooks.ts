import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycClient } from "./client";
import { KycStep1Request, KycStep2Request, KycStep3Request } from "@/types";

export const kycKeys = {
  status: ["kyc", "status"] as const,
};

export const useGetKycStatus = (enabled = true) => {
  return useQuery({
    queryKey: kycKeys.status,
    queryFn: kycClient.getStatus,
    enabled,
    retry: false,
  });
};

export const useKycStep1 = () => {
  return useMutation({
    mutationFn: (data: KycStep1Request) => kycClient.step1(data),
  });
};

export const useKycStep2 = () => {
  return useMutation({
    mutationFn: (data: KycStep2Request) => kycClient.step2(data),
  });
};

export const useKycStep2Skip = () => {
  return useMutation({
    mutationFn: () => kycClient.step2Skip(),
  });
};

export const useKycStep3 = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KycStep3Request) => kycClient.step3(data),
    onSuccess: () => {
      // Final step — refresh KYC status everywhere (nav badge, gates).
      queryClient.invalidateQueries({ queryKey: kycKeys.status });
    },
  });
};
