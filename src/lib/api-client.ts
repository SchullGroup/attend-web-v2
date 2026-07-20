import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Endpoints that do not require the Authorization header
const publicEndpoints = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-email",
  "/api/v1/auth/resend-email-otp",
  "/api/v1/auth/resend-phone-otp",
  "/api/v1/auth/verify-phone",
  "/api/v1/auth/refresh-token",
];

// Pre-login endpoints must never attach a token or trigger the 401 → refresh →
// redirect-to-login flow — the user isn't authenticated yet during verification.
const isPublicEndpoint = (url?: string) =>
  publicEndpoints.some((endpoint) => url?.includes(endpoint));

export const apiClient = axios.create({
  baseURL: typeof window !== "undefined" ? "" : API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: any) => {
    if (!isPublicEndpoint(config.url)) {
      const token = Cookies.get("accessToken");
      if (token && config.headers) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: any) => {
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry &&
      !isPublicEndpoint(originalRequest?.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the local Next.js proxy route which automatically sends the HttpOnly refresh token cookie
        const { data } = await axios.post("/api/auth/refresh");

        const newAccessToken = data?.data?.token;
        if (!newAccessToken) throw new Error("No token in refresh response");
        Cookies.set("accessToken", newAccessToken, {
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });

        apiClient.defaults.headers.common["Authorization"] =
          "Bearer " + newAccessToken;
        originalRequest.headers["Authorization"] = "Bearer " + newAccessToken;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove("accessToken");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
