export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  /** Item C — at least one of email or phone must be present (backend enforces). */
  email?: string;
  phone?: string;
  password: string;
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
