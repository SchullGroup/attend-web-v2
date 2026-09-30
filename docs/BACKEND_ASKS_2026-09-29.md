# Backend asks — 2026-09-29

Webinar attendees can't join. Zoom shows "Join link or TK", which means the webinar has
**registration on**. We don't register attendees with Zoom, so they can't get in.

1. **Create webinars with registration off:** `settings.approval_type: 2`. Read it back after
   creating and confirm Zoom saved 2.
2. **Fix the existing webinar:** set `approval_type: 2` on it, or recreate it.
3. **Check Zoom account defaults** (needs Zoom admin): webinar Registration must be off and not
   locked, or 1 and 2 won't stick.
4. **Optional:** add `registrationRequired` to `zoomMeeting` so the admin app can warn organisers.

Done when a signed-in attendee opens the live event and goes straight into the webinar.
