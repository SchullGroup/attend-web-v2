# Frontend fixes and open questions — 11 Sept 2026

Plain-English list of what's left: questions that need a decision, fixes I can do now, and fixes
that wait for the backend.

---

## 1. Questions for you

| # | Question | My suggestion |
|---|---|---|
| 1 | NIN only gates Innovation and Launch RSVPs. Once it's real, should people still be able to tap "I'll do this later" and skip it? | Your call. Right now the skip exists because NIN wasn't real yet. |
| 2 | Should Launch photos and videos also show on the guest pages? | The backend hasn't added them there yet. |
| 3 | Should AGM emails (notices, reminders) use each AGM's own help email? | The backend has only added it to the app so far. |
| 4 | Do you still want "120 Registered" on the Home cards? | If yes, we ask the backend to add it — it doesn't exist today. |
| 5 | Where should the AGM help email appear ("Need help? Contact …")? | Needs a design or a spot on the AGM page. |
| 6 | What should the Launch photo/video gallery look like? | Needs a design. |
| 7 | Event page banners: you asked for stock posters as the 2nd fallback and the logo style 3rd. But the posters always load, so the logo style would never show. Delete the logo style, or keep it? | Undecided. |
| 8 | The stock poster images are ~800KB each and now load on Home. Can I shrink them (about 10x smaller, same look)? | Yes, recommended. |

---

## 2. Things to tell the backend

1. **Make the NIN check a proper check.** Right now someone can get past the NIN step **without
   their face matching**:
   - The number lookup alone sets `ninVerified: true`.
   - The face check "does not set `ninVerified`" — it only reports whether the face matched.
   - Date of birth is optional, and the name check is skipped if the account's name is incomplete.

   So a person could type in someone else's real NIN and get through. **Ask: only set
   `ninVerified` after the face check passes** — the same way the AGM (BVN) check already works,
   where the face step is what completes it.
2. **Please test NIN in the sandbox before we connect to it.** Their own note says it has never
   made a real call.
3. **Answer question 4** (the attendee count) once you've decided.
4. **Nothing is live yet.** None of their new work is deployed, so we can't connect to any of it.
5. **Their two server fixes are still needed:** raise the upload size limit (causes the photo
   upload failure) and allow our website to read files from the storage bucket.

---

## 3. Fixes I can do now

These don't wait for the backend.

| # | Fix | Why |
|---|---|---|
| 1 | **Shrink profile photos before uploading**, and show "That image is too large" if it still fails. | The server currently rejects anything over 1MB, which is why the photo upload fails. Shrinking helps even after they raise the limit. |
| 2 | **Remove `bannerUrl`** from our code (8 places). | The backend confirmed it doesn't exist. |
| 3 | **Remove the dead attendee-count code** on Home. | The number it reads never exists, so it never shows. |
| 4 | **Fix our note to the backend** (`BACKEND_ASKS_2026-09-10.md`). | It still says the attendee count exists, and lists the wrong application statuses. |
| 5 | **Send the upload's `folder` setting in the web address**, not inside the form. | That's what the API expects. Small, probably not causing any bug. |

---

## 4. Fixes that wait for the backend to go live

| # | Fix | Waiting on |
|---|---|---|
| 1 | **NIN form (Innovation and Launch RSVPs only):** add a consent tick box (the backend requires it) and a date of birth box, connect to the real NIN lookup **and** the face check, let the RSVP through **only once the face matches**, and show proper messages ("this NIN is already on your account", "details don't match", "your face didn't match — try again", "try again later"). | Deploy, sandbox test, and the proper-check fix in section 2 |
| 2 | **Launch gallery:** show uploaded photos and videos on the Launch event page. Links expire after about an hour, so the page must refresh them if left open. | Deploy + a design |
| 3 | **AGM help email** on AGM pages. | Deploy + where to put it |
| 4 | **Attendee count** on Home cards. | Your answer to Q4, then the backend adding it |
