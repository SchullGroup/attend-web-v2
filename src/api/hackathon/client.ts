import { apiClient } from "@/lib/api-client";
import {
  ChallengesListResponse,
  ChallengeDetailResponse,
  ChallengeResourcesResponse,
  ChallengeCertificateResponse,
  MyTeamsResponse,
  TeamResponse,
  CreateTeamRequest,
  SubmitProjectRequest,
  ApiResponse,
} from "@/types";

export const hackathonClient = {
  getChallenges: async (params?: { search?: string; page?: number; size?: number }) => {
    const response = await apiClient.get<ChallengesListResponse>(
      "/api/v1/participant/challenges",
      { params },
    );
    return response.data;
  },

  getChallenge: async (id: string) => {
    const response = await apiClient.get<ChallengeDetailResponse>(
      `/api/v1/participant/challenges/${id}`,
    );
    return response.data;
  },

  getResources: async (id: string) => {
    const response = await apiClient.get<ChallengeResourcesResponse>(
      `/api/v1/participant/challenges/${id}/resources`,
    );
    return response.data;
  },

  getCertificate: async (id: string) => {
    const response = await apiClient.get<ChallengeCertificateResponse>(
      `/api/v1/participant/challenges/${id}/certificate`,
    );
    return response.data;
  },

  /**
   * Streams the canonical server-rendered certificate PDF (rendered onto the
   * organiser's artwork where they uploaded one). `downloadPath` comes straight
   * off the certificate response ΓÇö a public `/api/v1/public/certificates/{id}/download`
   * route, so no auth is needed, but routing through apiClient is harmless.
   */
  downloadCertificatePdf: async (downloadPath: string) => {
    const response = await apiClient.get(downloadPath, { responseType: "blob" });
    return response.data as Blob;
  },

  getMyTeams: async () => {
    const response = await apiClient.get<MyTeamsResponse>(
      "/api/v1/participant/teams/mine",
    );
    return response.data;
  },

  getMyTeam: async (challengeId: string) => {
    const response = await apiClient.get<TeamResponse>(
      `/api/v1/participant/challenges/${challengeId}/teams/mine`,
    );
    return response.data;
  },

  createTeam: async (challengeId: string, data: CreateTeamRequest) => {
    const response = await apiClient.post<TeamResponse>(
      `/api/v1/participant/challenges/${challengeId}/teams`,
      data,
    );
    return response.data;
  },

  submitProject: async (teamId: string, data: SubmitProjectRequest) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/teams/${teamId}/submit`,
      data,
    );
    return response.data;
  },
};
