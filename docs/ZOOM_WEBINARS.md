# Zoom webinars in the participant web app

How the participant app (attend-web) joins Zoom **webinars** from the live room, what it needs from
the backend, and the known issues. Plain Zoom **meetings** use the same path; the differences are
called out.

Last updated: 2026-10-09.

---

## 1. The short version

- The live room embeds Zoom's **Meeting SDK 6.2.0 (Client View)** in an iframe. Nobody leaves
  Attend to join.
- Everyone joins as a Zoom **attendee** (`role: 0`). Zoom itself decides whether the person is an
  attendee or a panelist, from the email and (for panelists) a personal token.
- The app always sends an **email** to Zoom: Zoom requires one for every webinar joiner.
- **Registration must be off** on every webinar. Attend doesn't register anyone with Zoom.
- **Panelists need their personal Zoom token** (`tk`). The frontend passes it; the backend doesn't
  send it yet (see §7).

---

## 2. Files

| File | What it does |
|---|---|
| `src/app/(main)/events/[id]/page.tsx` | Event page. "Join Live" goes to the live room (`/agm/live` for AGMs, `/events/live` when the event has a Zoom meeting/webinar). |
| `src/components/attend/LiveRoom.tsx` | The live room. Works out what to join and as whom, then renders `ZoomStage`. |
| `src/lib/zoom.ts` | `parseZoomUrl`, `resolveZoomJoin` (which meeting number + passcode), `panelistTokenOf` (panelist token). |
| `src/components/attend/ZoomStage.tsx` | Hosts the iframe, fetches the join signature, sends the join message, handles errors, Rejoin and retry. |
| `public/zoom-meeting.html` | The page inside the iframe. Loads Zoom's SDK from Zoom's CDN and calls `ZoomMtg.init` / `ZoomMtg.join`. |
| `src/app/api/zoom/signature/route.ts` | Signs the SDK join signature (JWT, `role: 0`). **Temporary:** the backend should own this (§8). |
| `next.config.ts` | Adds the cross-origin isolation headers, only on pages opened with `?coi=1`. |

---

## 3. Join flow, step by step

1. **User taps Join Live** on the event page.
2. **Live room loads the event.** Signed-in users: `GET /participant/events/{id}` (+ `/stream` once
   LIVE). Guests and proxies: the guest `/view` payload.
3. **Pick the meeting to join** (`resolveZoomJoin`):
   - `zoomMeetingNumber` + `zoomPassword` from the backend, if present (preferred);
   - otherwise parse the stream URL: `/j/<number>` (meeting) or `/w/<number>` (webinar), `pwd=` as
     the passcode fallback.
   - No Zoom link → not a Zoom event; the room shows the plain embed instead.
4. **Cross-origin isolation.** Zoom's SDK needs it for video. The live room reloads itself once with
   `?coi=1`, which makes `next.config.ts` add `Cross-Origin-Embedder-Policy: credentialless` (+
   opener policy). The Console logs `crossOriginIsolated: true` when this worked.
5. **Wait for the user's identity.** For signed-in users the Zoom box isn't mounted until the
   profile (and so the email) has loaded (`zoomIdentityReady`). Joining earlier sent no email and
   Zoom treated the user as anonymous.
6. **Work out who's joining:**
   - **Name:** the profile's full name, or the guest name.
   - **Email:** signed-in → the account email, lowercased (the backend stores panelists
     lowercased). Guests/proxies → the backend's `zoomUserEmail` (the proxy's email, or a
     per-session placeholder like `guest-…@guests.experienceattend.com`).
   - **Panelist token:** signed-in only → `panelistTokenOf(event)` (§7). Guests never get one.
7. **Signature.** `ZoomStage` posts `{ meetingNumber, role: 0 }` to `/api/zoom/signature`, which
   returns a signed JWT and the SDK key.
8. **Join.** `ZoomStage` sends `ZOOM_JOIN` to the iframe by `postMessage` (same origin only) with
   the SDK key, signature, number, passcode, name, email and `tk`. The iframe calls `ZoomMtg.join`,
   adding `userEmail` / `tk` only when present (never blank).
9. **Zoom takes over.** Attendees get Zoom's view-only screen; recognised panelists get the
   "Join as Panelist" prompt and full controls (Video, Share).

Messages back from the iframe: `ZOOM_JOINED`, `ZOOM_ERROR`, `ZOOM_LEFT`. If Zoom's success callback
never fires (it often doesn't in 6.x), the box reveals the meeting after 12 seconds anyway.

---

## 4. Meetings vs webinars

| | Meeting | Webinar |
|---|---|---|
| Link | `/j/<number>` | `/w/<number>` (the backend may also send a `/j/` link; we join by number either way) |
| `zoomType` | `MEETING` | `WEBINAR` |
| Email | Sent when we have one | **Required by Zoom** for every joiner |
| Registration | n/a | **Must be off**, or everyone gets the TK screen |
| Panelists | n/a | Recognised by email + personal `tk` token |
| Attendee view | Normal meeting UI | View-only: no camera, mic (unless the host allows it) or screen share |

---

## 5. What the backend sends us

**Signed-in, `GET /api/v1/participant/events/{id}`:**
- `zoomType` (`MEETING` / `WEBINAR`), `zoomMeetingNumber` (int64), `zoomPassword`
- `streamUrl` (the join link)
- `zoomPanelistToken` or `zoomPanelistJoinUrl` — **requested, not live yet** (§7)

**Guests / proxies (guest `/join` and `/view`):**
- `zoomType`, `zoomJoinUrl`, `zoomMeetingNumber`, `zoomPassword` (null until LIVE)
- `zoomUserEmail` (always set), `proxyEmail`, `canVote`

**Admin side (not used by this app):** `zoomMeeting.registrationRequired`, `hostEmail`,
`webinarId`, `startUrl` (contains the host's ZAK: treat as a secret).

---

## 6. In the live room

- **Video box height:** fixed for the session, `ZOOM_STAGE_HEIGHT` = 450px on phones,
  `clamp(450px, 72vh, 820px)` on desktop, so Zoom's own dialogs (e.g. the panelist prompt) fit.
- **Minimise:** top-centre of the box, shown on hover. Minimising **hides** the box but keeps it
  mounted: unmounting would leave the meeting.
- **Rejoin:** after leaving, the box offers Rejoin, which reloads the iframe and sends a fresh join
  (new signature, same number, same email/token).
- **Retry once:** if Zoom reports "not found / invalid / ended", `ZoomStage` re-fetches the stream
  URL once and retries. Note: this retry parses the URL only and ignores `zoomMeetingNumber` /
  `zoomPassword`.
- **Debug line:** every join logs
  `[zoom-meeting.html] joining <number> email: <email|(none)> panelist token: yes|no`.

---

## 7. Panelists

**Problem (confirmed 2026-10-09):** a user added as a panelist from the admin app gets Zoom's
"Join link or TK" screen in Attend, while non-panelists on the same webinar join fine. Opening the
panelist's own invitation link (which carries `tk=`) joins them as a panelist with no TK screen.

**Cause:** Zoom gives each panelist a personal token and expects it when they join. We only had the
number and the email.

**Frontend (built):** `panelistTokenOf(event)` reads `zoomPanelistToken`, or the `tk` from
`zoomPanelistJoinUrl`, and passes it to `ZoomMtg.join` as `tk`. Signed-in users only; everyone else
joins as before.

**Backend (pending):** return the token on the participant event detail **only for the signed-in
user** (never another panelist's), read **fresh from Zoom** each time (re-adding a panelist issues a
new token). Full ask: `docs/BACKEND_ASKS_2026-10-04.md`.

---

## 8. Setup and environment

**Vercel / `.env.local`:**
- `ZOOM_SDK_KEY`, `ZOOM_SDK_SECRET`: the Meeting SDK app's Client ID and Secret. The signature
  route also accepts the old name `NEXT_PUBLIC_ZOOM_SDK_KEY`. If these are missing or misnamed the
  live room shows "Zoom SDK credentials are not configured".
- `NEXT_PUBLIC_API_URL`: the backend.

**Zoom account rules:**
- **Same account:** the SDK app and the meetings/webinars must be in the **same Zoom account**, or
  Zoom blocks the join (error 4011).
- **Registration off** on webinars. The backend creates them with `settings.approval_type: 2` and
  reports `registrationRequired: false`. Webinars made before 2026-09-30 may still have it on.
- **Webinar licence** on the host, and the `webinar:read:webinar:admin` scope on the backend's
  Server-to-Server OAuth app.

**Still to move to the backend:** the signature route keeps the SDK secret in the frontend
deployment. The backend should expose its own signing endpoint.

---

## 9. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| "Zoom SDK credentials are not configured" | Env vars missing or misnamed | `ZOOM_SDK_KEY` / `ZOOM_SDK_SECRET` on Vercel |
| Stuck on "Connecting to the meeting…" | Iframe or signature request never finished | Network tab: `zoom-meeting.html`, `signature` |
| "Join link or TK" for **everyone** | Registration on for that webinar | Webinar's Registration in the Zoom portal / `registrationRequired` |
| "Join link or TK" for **panelists only** | No panelist token | Console line says `panelist token: no` (§7) |
| Error 4011 | Webinar in a different Zoom account from the SDK app | Host account vs SDK app account |
| No video / audio | Browser blocking Zoom, or isolation off | Use Chrome (Brave Shields break it); Console `crossOriginIsolated: true`; click **Join Audio** in Zoom's toolbar |
| Joined as attendee, expected panelist | Email doesn't match the panelist list, or no token | Console `email:` value vs the panelist's email; `panelist token:` |

The red `FirebaseError … API key not valid`, `chrome-error://… 404` and `window.ethereum` lines in the
Console come from browser extensions and Chrome, not from Attend or Zoom.
