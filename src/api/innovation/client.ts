import { apiClient } from "@/lib/api-client";
import {
  InnovationApplicationRequest,
  ChallengeApplicationConfigResponse,
  InnovationApplicationResponse,
  MyApplicationsResponse,
} from "@/types/innovation";

// Door B — the innovation-applications API. One-step submission; the model the
// admin/organiser actually reads (ChallengeApplicationDetailResponse).
export const innovationClient = {
  getApplicationConfig: async (challengeId: string) => {
    const res = await apiClient.get<ChallengeApplicationConfigResponse>(
      `/api/v1/innovation/challenges/${challengeId}/application-config`,
    );
    return res.data;
  },

  submitApplication: async (challengeId: string, data: InnovationApplicationRequest) => {
    const res = await apiClient.post<InnovationApplicationResponse>(
      `/api/v1/innovation/challenges/${challengeId}/applications`,
      data,
    );
    return res.data;
  },

  getMyApplications: async () => {
    const res = await apiClient.get<MyApplicationsResponse>(
      "/api/v1/innovation/applications/me",
    );
    return res.data;
  },

  getApplication: async (applicationId: string) => {
    const res = await apiClient.get<InnovationApplicationResponse>(
      `/api/v1/innovation/applications/${applicationId}`,
    );
    return res.data;
  },

  withdrawApplication: async (applicationId: string) => {
    const res = await apiClient.delete<InnovationApplicationResponse>(
      `/api/v1/innovation/applications/${applicationId}`,
    );
    return res.data;
  },
};
