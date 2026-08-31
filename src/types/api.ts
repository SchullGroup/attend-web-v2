export interface ApiResponse<T = void> {
  status: boolean | "SUCCESS" | "FAILURE";
  message: string;
  data: T;
  error?: string;
  // Stable machine-readable failure identifier (e.g. "EMAIL_CONFLICT"), added backend-side
  // 2026-08-08 on every response. Branch on this rather than `error`/`message` ΓÇö those are
  // display wording and can change without notice.
  code?: string;
  referenceId?: string;
  requestTime?: string;
  requestType?: string;
}
