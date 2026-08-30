import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types";

export interface GuestEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  branding: {
    logoUrl: string | null;
    brandColor: string | null;
  };
}

export interface GuestEventsData {
  totalCount: number;
  page: number;
  size: number;
  events: GuestEvent[];
}

export interface GuestEventsQueryParams {
  search?: string;
  page?: number;
  size?: number;
}

export type GuestEventsResponse = ApiResponse<GuestEventsData>;

export const guestClient = {
  getEvents: async (params?: GuestEventsQueryParams) => {
    // Routed through our own /api/guest/events proxy (not apiClient's usual
    // /api/v1/participant/* base) — this is a public, pre-login endpoint.
    const response = await apiClient.get<GuestEventsResponse>("/api/guest/events", {
      params,
    });
    return response.data;
  },
};
