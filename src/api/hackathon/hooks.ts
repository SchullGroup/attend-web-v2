import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hackathonClient } from "./client";
import { CreateTeamRequest, SubmitProjectRequest } from "@/types";

export const hackathonKeys = {
  challenges: (params?: object) => ["hackathon", "challenges", params] as const,
  challenge: (id: string) => ["hackathon", "challenge", id] as const,
  resources: (id: string) => ["hackathon", "resources", id] as const,
  certificate: (id: string) => ["hackathon", "certificate", id] as const,
  myTeam: (challengeId: string) => ["hackathon", "team", challengeId] as const,
  myTeams: () => ["hackathon", "teams", "mine"] as const,
};

export const useGetChallenges = (params?: { search?: string; page?: number; size?: number }) => {
  return useQuery({
    queryKey: hackathonKeys.challenges(params),
    queryFn: () => hackathonClient.getChallenges(params),
  });
};

export const useGetChallenge = (id: string) => {
  return useQuery({
    queryKey: hackathonKeys.challenge(id),
    queryFn: () => hackathonClient.getChallenge(id),
    enabled: !!id,
    retry: false,
  });
};

export const useGetResources = (id: string) => {
  return useQuery({
    queryKey: hackathonKeys.resources(id),
    queryFn: () => hackathonClient.getResources(id),
    enabled: !!id,
  });
};

export const useGetCertificate = (id: string) => {
  return useQuery({
    queryKey: hackathonKeys.certificate(id),
    queryFn: () => hackathonClient.getCertificate(id),
    enabled: !!id,
    retry: false,
  });
};

export const useGetMyTeams = () => {
  return useQuery({
    queryKey: hackathonKeys.myTeams(),
    queryFn: () => hackathonClient.getMyTeams(),
  });
};

export const useGetMyTeam = (challengeId: string) => {
  return useQuery({
    queryKey: hackathonKeys.myTeam(challengeId),
    queryFn: () => hackathonClient.getMyTeam(challengeId),
    enabled: !!challengeId,
    retry: false,
  });
};

export const useCreateTeam = (challengeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeamRequest) =>
      hackathonClient.createTeam(challengeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hackathonKeys.myTeam(challengeId) });
    },
  });
};

export const useSubmitProject = () => {
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: SubmitProjectRequest }) =>
      hackathonClient.submitProject(teamId, data),
  });
};
