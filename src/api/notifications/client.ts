import { apiClient } from "@/lib/api-client";
import {
  NotificationsResponse,
  NotificationsParams,
  NotificationPreferencesResponse,
  SaveNotificationPreferencesRequest,
  ApiResponse,
} from "@/types";

export const notificationsClient = {
  getPreferences: async () => {
    const response = await apiClient.get<NotificationPreferencesResponse>(
      "/api/v1/participant/notification-preferences",
    );
    return response.data;
  },

  savePreferences: async (data: SaveNotificationPreferencesRequest) => {
    const response = await apiClient.put<NotificationPreferencesResponse>(
      "/api/v1/participant/notification-preferences",
      data,
    );
    return response.data;
  },
  getNotifications: async (params?: NotificationsParams) => {
    const response = await apiClient.get<NotificationsResponse>(
      "/api/v1/participant/notifications",
      { params },
    );
    return response.data;
  },

  markRead: async (id: string) => {
    const response = await apiClient.patch<ApiResponse>(
      `/api/v1/participant/notifications/${id}/read`,
    );
    return response.data;
  },

  markAllRead: async () => {
    const response = await apiClient.patch<ApiResponse>(
      "/api/v1/participant/notifications/read-all",
    );
    return response.data;
  },
};
