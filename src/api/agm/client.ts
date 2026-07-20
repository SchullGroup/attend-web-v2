import { apiClient } from "@/lib/api-client";
import {
  ResolutionsResponse,
  ProxyResponse,
  ProxyHistoryResponse,
  AssignProxyRequest,
  CastVoteRequest,
  VoteReceiptResponse,
  QuestionsResponse,
  SubmitQuestionRequest,
  MinutesResponse,
  ApiResponse,
} from "@/types";

export const agmClient = {
  getVoteReceipt: async (eventId: string) => {
    const response = await apiClient.get<VoteReceiptResponse>(
      `/api/v1/participant/events/${eventId}/vote-receipt`,
    );
    return response.data;
  },

  // Finalised AGM minutes. Returns `data: null` (status true) when the admin hasn't
  // published them yet — callers must treat that as "not available", not an error.
  // 403 if the participant isn't registered for the event.
  getMinutes: async (eventId: string) => {
    const response = await apiClient.get<MinutesResponse>(
      `/api/v1/participant/events/${eventId}/minutes`,
    );
    return response.data;
  },

  getQuestions: async (eventId: string) => {
    const response = await apiClient.get<QuestionsResponse>(
      `/api/v1/participant/events/${eventId}/questions`,
    );
    return response.data;
  },

  submitQuestion: async (eventId: string, data: SubmitQuestionRequest) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${eventId}/questions`,
      data,
    );
    return response.data;
  },

  // Toggle upvote on a question. Returns { upvoted, upvoteCount }.
  upvoteQuestion: async (eventId: string, questionId: string) => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      `/api/v1/participant/events/${eventId}/questions/${questionId}/upvote`,
      {}
    );
    return response.data;
  },
  getResolutions: async (eventId: string) => {
    const response = await apiClient.get<ResolutionsResponse>(
      `/api/v1/participant/events/${eventId}/resolutions`,
    );
    return response.data;
  },

  castVote: async (eventId: string, resolutionId: string, data: CastVoteRequest) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${eventId}/resolutions/${resolutionId}/vote`,
      data,
    );
    return response.data;
  },

  getProxy: async (eventId: string) => {
    const response = await apiClient.get<ProxyResponse>(
      `/api/v1/participant/events/${eventId}/proxy`,
    );
    return response.data;
  },

  // Every proxy the participant has appointed, across all events.
  getProxyHistory: async () => {
    const response = await apiClient.get<ProxyHistoryResponse>(
      "/api/v1/participant/events/proxies",
    );
    return response.data;
  },

  assignProxy: async (eventId: string, data: AssignProxyRequest) => {
    const response = await apiClient.post<ProxyResponse>(
      `/api/v1/participant/events/${eventId}/proxy`,
      data,
    );
    return response.data;
  },
};
