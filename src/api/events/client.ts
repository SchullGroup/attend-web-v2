import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { normalizeResolutions } from "@/lib/resolution-normalize";
import {
  EventsListResponse,
  EventDetailResponse,
  EventDetail,
  EventsQueryParams,
  MyTicketResponse,
  ApiResponse,
  ApiResponseActivePollResponse,
  ApiResponsePressKitResponse,
  GuestEventsListResponse,
  GuestResolutionsResponse,
  QuestionsResponse,
  SubmitQuestionRequest,
  CastVoteRequest,
} from "@/types";

export const eventsClient = {
  getEvents: async (params?: EventsQueryParams) => {
    const response = await apiClient.get<EventsListResponse>(
      "/api/v1/participant/events",
      { params },
    );
    return response.data;
  },

  getMyEvents: async () => {
    const response = await apiClient.get<EventsListResponse>(
      "/api/v1/participant/events/mine",
    );
    return response.data;
  },

  checkIn: async (id: string) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${id}/check-in`,
    );
    return response.data;
  },

  getEvent: async (id: string) => {
    const response = await apiClient.get<EventDetailResponse>(
      `/api/v1/participant/events/${id}`,
    );
    return response.data;
  },

  // Live stream ΓÇö gated by the backend: 403 if not registered, 409 if not live.
  // Returns a generic map (eventId, eventTitle, streamUrl, status).
  getStream: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(
      `/api/v1/participant/events/${id}/stream`,
    );
    return response.data;
  },

  // Countdown to start ΓÇö { status, startsAt, secondsUntilStart } (0 when LIVE, null when ended).
  getCountdown: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(
      `/api/v1/participant/events/${id}/countdown`,
    );
    return response.data;
  },

  // Live quorum ΓÇö a generic map (percentage + met flag + attendee/share counts).
  getQuorum: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(
      `/api/v1/participant/events/${id}/quorum`,
    );
    return response.data;
  },

  // Join the waitlist for a full event.
  joinWaitlist: async (id: string) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${id}/waitlist`,
    );
    return response.data;
  },

  getMyTicket: async (id: string) => {
    const response = await apiClient.get<MyTicketResponse>(
      `/api/v1/participant/events/${id}/my-ticket`,
    );
    return response.data;
  },

  rsvp: async (id: string) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${id}/rsvp`,
    );
    return response.data;
  },

  cancelRsvp: async (id: string) => {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/participant/events/${id}/rsvp`,
    );
    return response.data;
  },

  getSavedEvents: async () => {
    const response = await apiClient.get<EventsListResponse>(
      "/api/v1/participant/events/saved",
    );
    return response.data;
  },

  getActivePoll: async (id: string) => {
    const response = await apiClient.get<ApiResponseActivePollResponse>(
      `/api/v1/participant/events/${id}/polls`,
    );
    return response.data;
  },

  respondToPoll: async (eventId: string, pollId: string, optionId: string) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${eventId}/polls/${pollId}/respond`,
      { optionId }
    );
    return response.data;
  },

  getPressKit: async (id: string) => {
    const response = await apiClient.get<ApiResponsePressKitResponse>(
      `/api/v1/participant/events/${id}/press-kit`,
    );
    return response.data;
  },

  saveEvent: async (id: string) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/participant/events/${id}/save`,
    );
    return response.data;
  },

  unsaveEvent: async (id: string) => {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/participant/events/${id}/save`,
    );
    return response.data;
  },

  // Guest access ΓÇö unauthenticated, bypasses the standard auth interceptor.
  guestJoinEvent: async (eventId: string, code: string, name?: string) => {
    const body: Record<string, string> = { code };
    if (name?.trim()) body.name = name.trim();
    const response = await axios.post<ApiResponse<Record<string, unknown>>>(
      `/api/v1/guest/events/${eventId}/join`,
      body,
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data;
  },

  // Public ΓÇö no token of any kind. This is the only guest entry point that doesn't
  // already require an event id, so it's what "Continue as guest" browses.
  guestBrowseEvents: async (params: { search?: string; eventType?: string; page?: number; size?: number }) => {
    const response = await axios.get<GuestEventsListResponse>(`/api/v1/guest/events`, {
      params,
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  },

  // View-only resolutions for a guest. Same items as the participant endpoint, but the
  // payload is a bare array rather than a { resolutions } object.
  guestGetResolutions: async (eventId: string, guestToken: string) => {
    const response = await apiClient.get<GuestResolutionsResponse>(
      `/api/v1/guest/events/${eventId}/resolutions`,
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    const data = response.data;
    if (data?.data) {
      data.data = normalizeResolutions(data.data);
    }
    return data;
  },

  guestGetView: async (eventId: string, guestToken: string) => {
    const response = await apiClient.get<ApiResponse<EventDetail>>(
      `/api/v1/guest/events/${eventId}/view`,
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  guestGetQuestions: async (eventId: string, guestToken: string) => {
    const response = await apiClient.get<QuestionsResponse>(
      `/api/v1/guest/events/${eventId}/questions`,
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  guestSubmitQuestion: async (eventId: string, guestToken: string, data: SubmitQuestionRequest) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/guest/events/${eventId}/questions`,
      data,
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  guestUpvoteQuestion: async (eventId: string, guestToken: string, questionId: string) => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      `/api/v1/guest/events/${eventId}/questions/${questionId}/upvote`,
      {},
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  // Guest polls (┬º9) ΓÇö guests can view and vote on polls.
  guestGetPolls: async (eventId: string, guestToken: string) => {
    const response = await apiClient.get<ApiResponseActivePollResponse>(
      `/api/v1/guest/events/${eventId}/polls`,
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  guestRespondToPoll: async (eventId: string, guestToken: string, pollId: string, optionId: string) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/guest/events/${eventId}/polls/${pollId}/vote`,
      { optionId },
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  // Unified proxy voting (┬º11) ΓÇö once a guest has signed in with a proxy code (or a
  // proxy QR payload) at /join, the session itself carries the right to vote
  // (`canVote: true`), so votes go straight here without resending the code each time.
  // Body is the same GuestVoteRequest shape as a participant: `{ choice }` for a
  // standard resolution, `{ votes: [...] }` for a candidate one.
  guestVote: async (
    eventId: string,
    guestToken: string,
    resolutionId: string,
    data: CastVoteRequest,
  ) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/guest/events/${eventId}/resolutions/${resolutionId}/vote`,
      data,
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  // Guest proxy voting (┬º10) ΓÇö a guest holding a proxy code can cast resolution
  // votes on behalf of the shareholder who issued the code. Superseded by guestVote
  // above for sessions that signed in as a proxy; kept as the fallback for a plain
  // guest session that only holds a loose proxy code.
  guestProxyVote: async (
    eventId: string,
    guestToken: string,
    resolutionId: string,
    proxyCode: string,
    data: CastVoteRequest,
  ) => {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/guest/events/${eventId}/resolutions/${resolutionId}/proxy-vote`,
      { proxyCode, ...data },
      { headers: { "X-Guest-Token": guestToken, "Content-Type": "application/json" } },
    );
    return response.data;
  },
};
