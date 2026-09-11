import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycClient } from "./client";
import { KycStep1Request, KycStep2Request, KycStep3Request, BvnSelfieRequest } from "@/types";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KycStep1Request) => kycClient.step1(data),
    // Returned so React Query awaits the refetch before the caller's own onSuccess runs.
    // The next page gates on `steps.step1.completed`, and with a 60s staleTime it would
    // otherwise read the pre-submit snapshot and send the user back here to redo step 1.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kycKeys.status }),
  });
};

export const useBvnSelfieCheck = () => {
  return useMutation({
    mutationFn: (data: BvnSelfieRequest) => kycClient.bvnSelfieCheck(data),
  });
};

export const useKycStep2 = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KycStep2Request) => kycClient.step2(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kycKeys.status }),
  });
};

export const useKycStep2Skip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => kycClient.step2Skip(),
    // A skip settles step 2 as far as the flow is concerned, so the status has changed
    // even though nothing was submitted ΓÇö the step indicator reads it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kycKeys.status }),
  });
};

export const useKycStep3 = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KycStep3Request) => kycClient.step3(data),
    // Returned, not fired and forgotten, for the same reason as step1 above: the caller's
    // onSuccess advances the sheet to its terminal stage, and that stage now reports whether
    // the user came out FULL_KYC or landed in the officer review queue. Without awaiting the
    // refetch it reads the pre-submit snapshot and tells a PENDING_REVIEW user they're
    // confirmed — which is exactly the lie the gate then contradicts by blocking them.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kycKeys.status }),
  });
};
