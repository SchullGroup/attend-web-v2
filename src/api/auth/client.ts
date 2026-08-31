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


