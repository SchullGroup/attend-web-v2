import { ApiResponse } from "./api";

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  referenceId: string;
  createdAt: string;
}

export interface NotificationsData {
  totalCount: number;
  unreadCount: number;
  page: number;
  size: number;
  notifications: Notification[];
}

export interface NotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  size?: number;
}

export type NotificationsResponse = ApiResponse<NotificationsData>;

export interface NotificationPreferences {
  emailRsvpConfirmation: boolean;
  emailEventReminder: boolean;
  emailNewDocument: boolean;
  inAppRsvpConfirmation: boolean;
  inAppEventReminder: boolean;
  inAppNewDocument: boolean;
  // Seventh flag, added backend-side 2026-08-08. Persists the push choice against the user
  // rather than the browser, so it survives a device change. Nothing sends push yet ΓÇö that
  // is blocked on the Firebase project existing ΓÇö but the value is stored either way.
  pushEnabled: boolean;
}

export type NotificationPreferencesResponse = ApiResponse<NotificationPreferences>;
export type SaveNotificationPreferencesRequest = NotificationPreferences;
