import axios from "axios";
import Cookies from "js-cookie";
import { clearGuestSession } from "@/lib/guest-session";

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
  // Every guest route authenticates with X-Guest-Token, never accessToken. Treating the
  // whole namespace as public stops the interceptor attaching an absent token and then
  // bouncing a legitimate guest to /login on the 401.
  "/api/v1/guest/",
];

// Pre-login endpoints must never attach a token or trigger the 401 ΓåÆ refresh ΓåÆ
// redirect-to-login flow ΓÇö the user isn't authenticated yet during verification.
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

// One in-flight refresh at a time, shared across every caller in this tab. The response
// interceptor (on a 401) and SessionBootstrap (on cold load with no access token) can both
// want a refresh at the same moment; the refresh route ROTATES the refresh token, so two
// concurrent calls would race ΓÇö the second arrives with a token the first already spent and
// fails, logging the user out. Collapsing them onto a single promise means one network call,
// one cookie write, and every caller resolves off the same result.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh") // raw axios, not apiClient ΓÇö must not re-enter this interceptor
      .then(({ data }) => {
        const token = data?.data?.token;
        if (!token) throw new Error("No token in refresh response");
        Cookies.set("accessToken", token, {
          expires: 7,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        return token as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Classify a failed refresh so the login page can explain itself.
 *
 * `code` is the contract and is checked first ΓÇö backend added stable codes on 2026-08-11
 * (SESSION_REVOKED for a login from another device) and 2026-08-17 (IDLE_TIMEOUT, once the
 * 120-minute idle check was actually wired into every authenticated request, not just the
 * refresh endpoint). The prose match is a fallback for responses predating those codes; it
 * deliberately covers both the old wording ("Session invalidated") and the new ("Session
 * revoked"). An unrecognised failure degrades to the generic redirect rather than to a
 * wrong explanation.
 */
function logoutReason(err: any): "other-device" | "idle" | null {
  const body = err?.response?.data ?? {};
  const code = String(body.code ?? "").toUpperCase();
  if (code === "SESSION_REVOKED") return "other-device";
  if (code === "IDLE_TIMEOUT") return "idle";

  const text = `${body.error ?? ""} ${body.message ?? ""}`.toLowerCase();
  if (/another device|invalidated|revoked/.test(text)) return "other-device";
  if (/inactivity|expired after/.test(text)) return "idle";
  return null;
}

apiClient.interceptors.response.use(
  (response: any) => {
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      (status === 401 || status === 403) &&
      !isPublicEndpoint(originalRequest?.url)
    ) {
      // A guest gets 401/403 from every participant endpoint by design ΓÇö they have no
      // account. That's a "not allowed", not an expired session, so it must not touch the
      // guest session: clearing the isGuest cookie and reloading (what this used to do)
      // dropped them straight back on /login the moment any such call fired.
      // End the guest session only on a genuine token-lifecycle failure, never on a
      // business-rule rejection. A guest action endpoint (vote, proxy-vote, poll vote,
      // question) legitimately returns 403 for "wrong proxy code", "not a proxy session"
      // or "already voted" ΓÇö those must surface inline, NOT eject the guest from the
      // live meeting. So auto-logout fires on:
      //   ΓÇó 401 on any guest route  ΓåÆ invalid/expired token, and
      //   ΓÇó 403 on the /view heartbeat ΓåÆ access revoked by the admin.
      const guestUrl: string = originalRequest?.url ?? "";
      const isGuestRoute = guestUrl.includes("/api/v1/guest/") && !guestUrl.includes("/join");
      if (
        isGuestRoute &&
        (status === 401 || (status === 403 && guestUrl.includes("/view")))
      ) {
        clearGuestSession();
        if (typeof window !== "undefined") {
          window.location.href = "/guest?expired=true";
        }
        return Promise.reject(error);
      }

      if (Cookies.get("isGuest") === "true") {
        return Promise.reject(error);
      }

      // Check for a reason on THIS failure before touching refresh at all ΓÇö whether it's
      // the very first 401/403, or a request retried after a refresh that "succeeded"
      // (backend handed back a technically-valid token) while the session stayed dead.
      // The old code only ever checked the refresh call's own error, which missed that
      // second case entirely: originalRequest._retry was already true by then, so it fell
      // through every check below and rejected silently ΓÇö a real logout with no banner.
      const immediateReason = logoutReason(error);
      if (immediateReason) {
        Cookies.remove("accessToken");
        if (typeof window !== "undefined") {
          window.location.href = `/login?reason=${immediateReason}`;
        }
        return Promise.reject(error);
      }

      // A 403 with no session-death code is an AUTHORIZATION decision, not an expired
      // session: the token is valid, the backend just won't allow THIS action for THIS
      // user right now. Common on an event detail page ΓÇö press kit embargoed/not released,
      // or the live stream is gated to registered attendees ("403 if not registered"). The
      // old code refreshed on it anyway, retried, got the same 403, saw _retry set and
      // redirected to /login ΓÇö so opening a launch logged the user out. Refreshing can't
      // change an authorization answer, so surface it to the caller (useGetPressKit already
      // renders a "not available" state off pressKitError.response.status === 403). Only 401
      // (a genuine authentication failure) proceeds to the refresh flow below.
      if (status === 403) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        // Already retried once after a refresh and it's still failing, with nothing telling
        // us why ΓÇö bounce to a plain login rather than attempting refresh in a loop.
        Cookies.remove("accessToken");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

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
        // Shared, de-duplicated refresh (also used by SessionBootstrap on cold load).
        // Sets the accessToken cookie internally and returns the new token.
        const newAccessToken = await refreshAccessToken();

        apiClient.defaults.headers.common["Authorization"] =
          "Bearer " + newAccessToken;
        originalRequest.headers["Authorization"] = "Bearer " + newAccessToken;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        Cookies.remove("accessToken");
        if (typeof window !== "undefined") {
          // Why the session ended decides what the login page says. Backend distinguishes
          // "signed in elsewhere" from a 2h inactivity timeout, and a user who sees neither
          // reason assumes the app logged them out at random.
          const reason = logoutReason(refreshError);
          window.location.href = reason ? `/login?reason=${reason}` : "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
