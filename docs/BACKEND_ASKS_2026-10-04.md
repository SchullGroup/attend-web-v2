
---

# Backend ask — webinar panelists get Zoom's "Join link or TK" screen (2026-10-09)

**Problem:** on a webinar, everyone joins from the live room except the person added as a
**panelist** (from the admin app). Zoom shows them "Join link or TK". Tested: a non-panelist on
the same event gets in; only the panelist is blocked.

**Why:** when someone is added as a panelist, Zoom gives them a personal join link carrying a
token (`tk=…`). Joining as a panelist needs that token. The participant app only has the webinar
number and the user's email, so it can't pass it.

**Frontend (done):** if the participant event detail includes the user's panelist token, the app
passes it to Zoom's join (`tk`). Nothing changes for anyone without one.

## Ask

On `GET /api/v1/participant/events/{id}` (`ParticipantEventDetailResponse`), when the signed-in
user is a panelist on that event's webinar, add **one** of:

- `zoomPanelistToken`: the `tk` value from their panelist join link, **or**
- `zoomPanelistJoinUrl`: their full panelist join link (we read `tk` from it).

Leave it `null` / absent for everyone else.

**Must:**
1. **Only the caller's own token.** Never another panelist's: that would let one person join as
   someone else.
2. **Fresh from Zoom.** Removing and re-adding a panelist issues a new token, and the old one stops
   working. Read the current value (Zoom's `GET /webinars/{webinarId}/panelists` returns each
   panelist's `join_url`), don't store it once.
3. Match the panelist by the user's email, case-insensitively.

**Done when:** a user added as a panelist opens the live event and joins the webinar as a panelist
with no TK screen.
