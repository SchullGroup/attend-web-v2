import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./client";
import Cookies from "js-cookie";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authClient.login,
    onSuccess: (response: any) => {
      // Access token is saved here manually for the interceptor
      // The Next.js proxy route has already set the refreshToken as an HttpOnly cookie
      const token = response.data.token;
      if (token) {
        Cookies.set("accessToken", token, {
          // Match the 7-day refresh-token window so the cookie survives a browser
          // restart. Without an `expires` this was a session cookie: closing the
          // browser dropped it, middleware then saw no token and bounced the user to
          // /login ΓÇö a silent "random" logout even though the refresh token was valid.
          expires: 7,
          secure: process.env.NODE_ENV === "production",
          // `lax`, not `strict`: strict drops the cookie on top-level navigations INTO
          // the app (e.g. following an email link), so the entry landed on /login.
          sameSite: "lax",
        });
      }
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  const clearAndRedirect = () => {
    Cookies.remove("accessToken");
    queryClient.clear();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return useMutation({
    mutationFn: authClient.logout,
    // Clear local session and redirect regardless of whether the backend
    // call succeeds ΓÇö an expired token would otherwise trap the user.
    onSuccess: clearAndRedirect,
    onError: clearAndRedirect,
  });
};

export const useGetMe = (enabled = true) => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authClient.getMe,
    // only fetch if access token exists and enabled is true
    enabled: enabled && !!Cookies.get("accessToken"),
    retry: false,
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: authClient.register,
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: authClient.verifyEmail,
  });
};

export const useResendEmailOtp = () => {
  return useMutation({
    mutationFn: authClient.resendEmailOtp,
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: authClient.forgotPassword,
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: authClient.resetPassword,
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: authClient.changePassword,
  });
};

// Item L — BVN recovery hooks
export const useBvnRecoverInit = () => useMutation({ mutationFn: authClient.bvnRecoverInit });
export const useBvnRecoverVerify = () => useMutation({ mutationFn: authClient.bvnRecoverVerify });
export const useBvnRecoverComplete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authClient.bvnRecoverComplete,
    onSuccess: (response: any) => {
      const token = response?.data?.token;
      if (token) {
        Cookies.set("accessToken", token, {
          expires: 7,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
};
