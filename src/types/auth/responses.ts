import { ApiResponse } from "@/types/api";

export interface AuthResponse {
  token: string;
  refreshToken: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt?: string;
}

export interface MeResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  role: string;
  email: string;
  /**
   * ⚠️ Presigned and **expires in an hour** (backend doc §25) — the bucket keeps objects
   * private, so this is signed per request. Render it from a freshly fetched `/me`; do not
   * persist it in localStorage or a long-lived cached user object.
   */
  avatarUrl: string | null;
  phoneNumber?: string;
  /**
   * ⚠️ `username` is omitted on purpose. The response does carry one (backend §25), but it is
   * deliberately not surfaced anywhere in this app, so it is left off the type to keep it from
   * being rendered or sent by accident. See MyProfilePanel.
   */
  createdAt?: string;
}

export type AuthApiResponse = ApiResponse<AuthResponse>;
export type MeApiResponse = ApiResponse<MeResponse>;
