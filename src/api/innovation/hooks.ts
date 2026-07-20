import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { innovationClient } from "./client";
import { notificationKeys } from "@/api/notifications/hooks";
import { InnovationApplicationRequest } from "@/types/innovation";

export const innovationKeys = {
  all: ["innovation"] as const,
  config: (id: string) => [...innovationKeys.all, "config", id] as const,
  myApps: () => [...innovationKeys.all, "myApps"] as const,
  app: (id: string) => [...innovationKeys.all, "app", id] as const,
};

export const useApplicationConfig = (challengeId: string) =>
  useQuery({
    queryKey: innovationKeys.config(challengeId),
    queryFn: () => innovationClient.getApplicationConfig(challengeId),
    enabled: !!challengeId,
  });

export const useGetMyApplications = () =>
  useQuery({
    queryKey: innovationKeys.myApps(),
    queryFn: () => innovationClient.getMyApplications(),
  });

export const useGetApplication = (applicationId: string) =>
  useQuery({
    queryKey: innovationKeys.app(applicationId),
    queryFn: () => innovationClient.getApplication(applicationId),
    enabled: !!applicationId,
  });

export const useSubmitApplication = (challengeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InnovationApplicationRequest) =>
      innovationClient.submitApplication(challengeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: innovationKeys.myApps() });
      qc.invalidateQueries({ queryKey: innovationKeys.config(challengeId) });
      // If the backend emits an "application submitted" notification, refetch so it
      // shows up in the bell/notifications list without a manual reload.
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useWithdrawApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => innovationClient.withdrawApplication(applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: innovationKeys.myApps() }),
  });
};
