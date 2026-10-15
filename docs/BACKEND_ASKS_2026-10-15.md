# Backend ask — non-shareholders can vote at a live AGM (2026-10-15)

**Reported during a live AGM:** a user who is **not a shareholder** of the company joined the
AGM, saw the resolutions and **voted**, and the vote was accepted.

## Why it happened

1. **The backend doesn't check the register when a vote is cast.**
   `POST /api/v1/participant/events/{id}/resolutions/{resolutionId}/vote` is documented as
   *"Casts or changes the participant's vote… Only allowed during LIVE events."* It has no
   shareholder or register requirement, and the vote was accepted.
2. **The participant app relied on RSVP as the gate.** The event page only shows "Join Live" to
   users who have RSVP'd, and you refuse an RSVP from non-shareholders. But a direct link to the
   live room (`/agm/live?eventId=…`) skipped the event page entirely.

**Frontend (done):** the live room now also requires an RSVP (`hasRsvped`, falling back to
`registered`) as well as full KYC, however the user arrives. That closes the gap in our app, but
anyone calling the API directly can still vote, so the real fix has to be server-side.

## Asks

### 1. Enforce register membership on the server (the fix)

For AGM/EGM events, refuse these for any caller who is **not on that event's shareholder
register** (the register / custom list the event targets):

| Endpoint | Expected |
|---|---|
| `POST /participant/events/{id}/resolutions/{resolutionId}/vote` | `403`, code `NOT_A_SHAREHOLDER` |
| `GET /participant/events/{id}/resolutions` | `403`, or an empty list |
| `POST /participant/events/{id}/proxy` (appoint proxy) | `403` |
| Pre-AGM voting endpoints | `403` |
| `GET /participant/events/{id}/vote-receipt` | `403`, or empty |

Use a clear message, e.g. *"You are not a shareholder for this AGM."* Our FAQ already promises
that wording, and the app shows the backend's message as-is.

Proxy and guest sessions voting through `/guest/...` should keep working: they vote on behalf of a
shareholder, not as themselves.

### 2. Clean up today's meeting

- Find votes cast on this AGM by accounts that aren't on its register, and remove or void them.
- Check the tallies, quorum and vote receipts were recalculated afterwards.
- Tell us which event and how many votes were affected, so the organiser can be told.

### 3. Tell the app whether the user is a shareholder for this AGM

On `GET /api/v1/participant/events/{id}` (`ParticipantEventDetailResponse`), add a clear flag,
e.g. **`isShareholder: boolean`** (on this event's register, regardless of RSVP).

Today `registered` has no description in the spec, and our code assumes it means "on the
register". Please either confirm that, or add the new flag. With it, the app will:
- hide the vote buttons and show "You are not a shareholder for this AGM" to non-shareholders,
  while still letting them watch and ask questions if you want that;
- hide Appoint Proxy and Pre-vote for them.

### 4. Confirm RSVP stays shareholder-only for AGMs

The app's live-room gate relies on "RSVP'd" implying "shareholder". Please confirm
`POST /participant/events/{id}/rsvp` always refuses non-shareholders for AGM/EGM events,
including when `shareholderTargeting` is `CUSTOM_LIST`.

## Done when

- A signed-in, verified user who isn't on the register gets `403 NOT_A_SHAREHOLDER` when voting,
  whether through the app or by calling the API directly.
- Shareholders vote exactly as before.
- Proxies and guest proxy sessions still vote.
- The affected votes from today's AGM are removed and the tallies are corrected.
