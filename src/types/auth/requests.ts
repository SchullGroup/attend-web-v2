export interface LoginRequest {
  identifier: string;
  emailOrPhone?: string;
  email?: string;
  password: string;
  /**
   * Stable per-install id (see `lib/device-id`). The backend invalidates the previous
   * device's session when this differs from the last login. Optional on the wire —
   * omitting it just skips single-device enforcement for that login.
   */
  deviceId?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  /** Backend now requires this and 400s ("Password mismatch") if it differs from password. */
  confirmPassword: string;
}

// Item L — BVN-OTP recovery for shareholders without email/phone.
export interface BvnRecoverInitRequest {
  bvn: string;
}
export interface BvnRecoverVerifyRequest {
  sessionId: string;
  otp: string;
}
export interface BvnRecoverCompleteRequest {
  authToken: string;
  email?: string;
  phone?: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

// Body for `PATCH /api/v1/auth/me` — the Settings "My profile" form. Shape per the backend
// status doc §25 (2026-08-28).
//
// Every field is optional and **omitting one leaves it unchanged** — that's the point of PATCH.
// Only send fields the user actually edited.
//
// Blank strings mean two different things, deliberately:
//   • firstName / lastName / phone — `""` is REJECTED (400). None can be empty on an account,
//     so an empty value there is only ever an accidental empty input.
//   • avatarUrl — `""` is an EXPLICIT CLEAR. It's genuinely optional, and since omitting means
//     "unchanged" there'd otherwise be no way to remove it.
//
// ⚠️ `username` is intentionally absent. The endpoint accepts one (§25), but it is not surfaced
// anywhere in this app by product decision, and leaving it off the type means it cannot be sent
// by accident. Don't add it back without that decision being reversed.
//
// `avatarUrl` must be the `fileUrl` from POST /api/v1/upload, never `previewUrl` — previewUrl is
// itself a short-lived signed link, so storing it would write an already-expiring URL to the
// database and the picture would break within the hour, permanently.
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  /** Named `phone`, not `phoneNumber` — the read model (`MeResponse`) uses the latter. */
  phone?: string;
  avatarUrl?: string;
}
