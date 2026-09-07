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

// Body for the Settings "My profile" form. Every field optional so a partial edit sends only
// what changed. `avatarUrl` is a Cloudinary URL already returned by POST /api/v1/upload.
// See authClient.updateProfile — the endpoint itself is not built yet.
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}
