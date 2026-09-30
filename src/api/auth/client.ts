import { apiClient } from "@/lib/api-client";
import {
  AuthApiResponse,
  LoginRequest,
  MeApiResponse,
  RegisterRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  ApiResponse,
} from "@/types";
import type {
  BvnRecoverInitRequest,
  BvnRecoverVerifyRequest,
  BvnRecoverCompleteRequest,
  UpdateProfileRequest,
} from "@/types/auth/requests";
import axios from "axios";
import Cookies from "js-cookie";

export const authClient = {
  // Proxied through Next.js BFF to avoid CORS and manage cookies
  login: async (data: LoginRequest) => {
    const response = await axios.post<AuthApiResponse>("/api/auth/login", data);
    return response.data;
  },

  // Uses apiClient so the interceptor sends the Authorization header to the BFF,
  // which then forwards it to the backend to actually invalidate the token
  logout: async () => {
    const response = await apiClient.post<AuthApiResponse>("/api/auth/logout");
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<MeApiResponse>("/api/v1/auth/me");
    return response.data;
  },

  // Profile update — the real contract, per the backend status doc §25 (2026-08-28). This was
  // previously a guessed `PUT` with guessed field names; it's a PATCH, the phone field is
  // `phone` (not `phoneNumber`), and there is no `fullName` field at all.
  //
  // PATCH, not PUT, is load-bearing: omitting a field means "leave unchanged", so editing a
  // phone on one device can't blank a name changed on another. Only send what the user touched.
  //
  // Acts on the caller's own account only — the user is resolved from the JWT, never from the
  // body. Returns the full updated profile in `GET /me`'s shape, so the caller can replace its
  // cached profile from this one response.
  //
  // 400 blank first/last/phone, name >50 chars, username outside 3-30 or its charset, bad phone
  // 409 phone or username already belongs to another account
  // 404 token valid but the user row is gone
  //
  // ⚠️ May still 404 until the backend deploys §25 — that doc has §16-19 committed-but-undeployed
  // as of 2026-08-31 and doesn't list §20-25 as deployed at all. The form's soft-failure path
  // covers that; this now at least points at the route that will exist.
  updateProfile: async (data: UpdateProfileRequest) => {
    const response = await apiClient.patch<MeApiResponse>("/api/v1/auth/me", data);
    return response.data;
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<ApiResponse>("/api/v1/auth/register", data);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest) => {
    const response = await apiClient.post<ApiResponse>("/api/v1/auth/verify-email", data);
    return response.data;
  },

  resendEmailOtp: async (data: { email: string }) => {
    const response = await apiClient.post<ApiResponse>("/api/v1/auth/resend-email-otp", data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest) => {
    const response = await apiClient.post<ApiResponse>("/api/v1/auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest) => {
    const response = await apiClient.post<ApiResponse>("/api/v1/auth/reset-password", data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await apiClient.post<ApiResponse>("/api/v1/auth/change-password", data);
    return response.data;
  },

  // Item L — BVN-OTP recovery for shareholders without email/phone.
  bvnRecoverInit: async (data: BvnRecoverInitRequest) => {
    const response = await apiClient.post<ApiResponse<{ sessionId: string; maskedPhone: string }>>(
      "/api/v1/auth/bvn-recover/init",
      data,
    );
    return response.data;
  },
  bvnRecoverVerify: async (data: BvnRecoverVerifyRequest) => {
    const response = await apiClient.post<
      ApiResponse<{ authToken: string; matchedShareholderId: string; firstName: string; lastName: string }>
    >("/api/v1/auth/bvn-recover/verify", data);
    return response.data;
  },
  bvnRecoverComplete: async (data: BvnRecoverCompleteRequest) => {
    const response = await apiClient.post<AuthApiResponse>(
      "/api/v1/auth/bvn-recover/complete",
      data,
    );
    return response.data;
  },
};
