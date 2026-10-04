# Backend ask — block organiser accounts from the participant app (2026-10-04)

**Problem:** a client admin can sign in to the participant web app with their admin account and
use it like an attendee (RSVP, join live, vote, Q&A).

**Why:** `POST /api/v1/auth/login` accepts every role. Nothing in the API restricts participant
endpoints (`/api/v1/participant/**`) to participant accounts.

## What the frontend has done

The participant app now checks `role` / `roles` on the login response and on `GET /auth/me`.
Organiser accounts are refused with "This is an organiser account. Please sign in to the Attend
admin app instead." Already signed-in organiser sessions are signed out.

Blocked roles: `SUPER_ADMIN`, `CLIENT_ADMIN`, `ADMIN`, `EVENT_MANAGER`, `VIEWER`.
Allowed: `ATTENDEE`, `SHAREHOLDER`. `JUDGE` is allowed for now (see question 3).

This is not enough on its own: anyone can call the API directly and skip the frontend.

## Asks

1. **Enforce it server-side.** Return `403` with code `ORGANISER_ACCOUNT` from
   `/api/v1/participant/**` (and any other participant-only routes) when the caller's account
   holds an organiser role.
2. **Refuse the login itself for the participant app.** Today the backend issues tokens before we
   can check the role. Because of the single-session rule, an admin who merely *tries* the
   participant app is signed out of the admin app. Options:
   - accept a `client: "PARTICIPANT_WEB"` (or similar) field on `LoginRequest`, and reject
     organiser roles with `403 ORGANISER_ACCOUNT` before issuing tokens; or
   - give the participant app its own login endpoint that only accepts participant roles.
3. **Confirm the role list.** Is the list above complete? Are `ADMIN` / `EVENT_MANAGER` /
   `VIEWER` / `JUDGE` (from `InviteMemberRequest`) stored as account roles, or only as roles
   inside an organisation? Can a judge also be a normal participant?
4. **Accounts with both roles:** can one account be both an organiser and a shareholder? We
   currently block any account with an organiser role. If dual-role accounts are expected,
   tell us how they should sign in to the participant app.

**Done when:** an organiser account gets `403 ORGANISER_ACCOUNT` from the participant login and
participant endpoints, and its admin-app session is unaffected.

---

# Backend ask — guest event list (`GET /api/v1/guest/events`)

**Problem:** guests can't see live or current AGMs, and live ones aren't shown first.

**What we found (live API, 2026-10-04):**
- Events come back **oldest first**, 50 per page (108 in total). Page 0 is all August events, so
  current AGMs were only on pages 1–2.
- **`eventType` is ignored as a filter.** The spec only lists `search`, `page`, `size`; passing
  `eventType=AGM_EGM` returns every type.
- **No `status` in the response.** Items carry only `id, title, date, endDate, startTime,
  eventType, branding`, so we can't tell live from ended.

**Frontend workaround (done):** we fetch every page, filter by `eventType` ourselves, and keep
anything whose last day is within the past 7 days (an AGM is often left LIVE after its date).
Events that have started are listed first, newest first, then upcoming. We can't show a LIVE badge
or put truly live events first, and an ended event lingers for up to 7 days.

## Asks

1. **Add `status`** (`PUBLISHED` / `LIVE` / `ENDED` / `CANCELLED`) to each item. This is the main
   one: with it we put LIVE first with a badge and hide ended events straight away.
2. **Don't return ended or cancelled events** (or support `status=` / `upcoming=true`), so guests
   only see events they can still join.
3. **Support `eventType=`** as a filter (`AGM_EGM`, `PRODUCT_LAUNCH`, `GENERAL_EVENT`,
   `INNOVATION_CHALLENGE`).
4. **Order LIVE first, then upcoming soonest first** (or accept a `sort=` param), so the first page
   is the useful one.

**Done when:** `GET /guest/events?eventType=AGM_EGM` returns live AGMs first with
`status: "LIVE"`, then upcoming ones, and no ended events.
