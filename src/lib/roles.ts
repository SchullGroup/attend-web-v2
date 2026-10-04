// The participant app is for attendees and shareholders only. Organiser-side accounts share the
// same login endpoint (POST /auth/login accepts any role), so without a check here a client
// admin could sign in and use the app as if they were an attendee.
//
// Role names come from the API spec: AuthResponse.role documents SUPER_ADMIN / CLIENT_ADMIN /
// ATTENDEE, KYC step 3 assigns SHAREHOLDER, and InviteMemberRequest lists the organisation team
// roles ADMIN / EVENT_MANAGER / VIEWER / JUDGE.
//
// A denylist, not an allowlist: participant accounts can carry roles we don't know about yet,
// and locking real shareholders out is worse than a new organiser role slipping through.
// JUDGE is deliberately NOT here — a hackathon judge may also be a participant on Attend; add
// it if the product team confirms judge accounts are organiser-only.
//
// Any organiser role blocks the account, even if it also holds ATTENDEE/SHAREHOLDER. An
// organiser who is also a shareholder signs in to the participant app with a separate account.
const ORGANISER_ROLES = new Set(["SUPER_ADMIN", "CLIENT_ADMIN", "ADMIN", "EVENT_MANAGER", "VIEWER"]);

export const ORGANISER_ACCOUNT_CODE = "ORGANISER_ACCOUNT";
export const ORGANISER_ACCOUNT_MESSAGE =
  "This is an organiser account. Please sign in to the Attend admin app instead.";

export function isOrganiserAccount(...roles: (string | string[] | null | undefined)[]): boolean {
  return roles
    .flat()
    .some((r) => typeof r === "string" && ORGANISER_ROLES.has(r.trim().toUpperCase()));
}
