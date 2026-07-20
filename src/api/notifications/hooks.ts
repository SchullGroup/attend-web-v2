import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsClient } from "./client";
import { NotificationsParams, SaveNotificationPreferencesRequest } from "@/types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: NotificationsParams) => [...notificationKeys.all, params] as const,
  preferences: ["notification-preferences"] as const,
};

export const useGetNotificationPreferences = () => {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: () => notificationsClient.getPreferences(),
  });
};

export const useSaveNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveNotificationPreferencesRequest) =>
      notificationsClient.savePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences });
    },
  });
};

export const useGetNotifications = (params?: NotificationsParams, enabled = true) => {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsClient.getNotifications(params),
    enabled,
  });
};

export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsClient.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsClient.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
