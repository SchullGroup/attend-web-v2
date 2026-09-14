# Frontend fixes and open questions — 11 Sept 2026 (updated 14 Sept)

Plain-English list of what's left: questions that need a decision, fixes I can do now, and the work
the backend has now unblocked.

> **Update 14 Sept:** the backend has put its new work live — NIN, the Launch gallery and the AGM
> help email are all on the live API now. And they made the **proper NIN check** we asked for: the
> NIN step now only passes after the person's face matches. Checked against the live API
> description.
>
> **Later on 14 Sept:** our NIN form is now **connected** to that check (section 4, item 1). It
> can't be skipped, has no date of birth box, and asks for agreement with a one-line tick box.

---

## 1. Questions for you

| # | Question | My suggestion |
|---|---|---|
| 1 | ~~Should people still be able to skip the NIN check?~~ | **Decided: no.** Not skippable. |
| 2 | Should Launch photos and videos also show on the guest pages? | The backend hasn't added them there yet. |
| 3 | Should AGM emails (notices, reminders) use each AGM's own help email? | The backend has only added it to the app so far. |
| 4 | Do you still want "120 Registered" on the Home cards? | If yes, we ask the backend to add it — it doesn't exist today. |
| 5 | Where should the AGM help email appear ("Need help? Contact …")? | Needs a design or a spot on the AGM page. |
| 6 | What should the Launch photo/video gallery look like? | Needs a design. |
| 7 | Event page banners: you asked for stock posters as the 2nd fallback and the logo style 3rd. But the posters always load, so the logo style would never show. Delete the logo style, or keep it? | Undecided. |
| 8 | The stock poster images are ~800KB each and now load on Home. Can I shrink them (about 10x smaller, same look)? | Yes, recommended. |

---

## 2. Things to tell the backend

1. ~~Make the NIN check a proper check.~~ **Done** — confirmed on the live API. Step 1 (the
   number lookup) no longer passes anyone; step 2 (the face match) is what passes them.
2. **Block the RSVP on the server too.** Our app now stops anyone RSVPing to an Innovation or
   Launch event until they've passed NIN — but only in the app. Someone calling the RSVP address
   directly (`POST /participant/events/{id}/rsvp`) would skip it. **Ask: reject the RSVP unless
   `ninVerified` is true** for those two event types.
3. **Waitlist question.** When an event is full, people can join a waitlist, and an organiser can
   approve them from it. **Does approving someone sign them up automatically?** If yes, they'd get
   in without NIN — ask the backend to require `ninVerified` there too. (Separately: the event
   page may not show "On waitlist" after you join, because the live API doesn't seem to send the
   field our page reads. Needs one real response to confirm.)
4. **Confirm NIN has been tested against the real provider.** Their note said it had never made a
   real call. The live API can't tell us whether that's changed.
5. **Answer question 4** (the attendee count) once you've decided.
6. **Are their two server fixes done?** Raising the upload size limit (the cause of the photo upload
   failure) and letting our website read files from the storage bucket. These are server settings,
   so they don't show up in the API and I can't check them.

---

## 3. Fixes I can do now

| # | Fix | Why |
|---|---|---|
| 1 | **Shrink profile photos before uploading**, and show "That image is too large" if it still fails. | The server rejected anything over 1MB, which is why the photo upload failed. Shrinking helps even once they raise the limit. |
| 2 | **Remove `bannerUrl`** from our code (8 places). | The backend confirmed it doesn't exist. |
| 3 | **Remove the dead attendee-count code** on Home. | The number it reads never exists, so it never shows. |
| 4 | **Fix our note to the backend** (`BACKEND_ASKS_2026-09-10.md`). | It still says the attendee count exists, and lists the wrong application statuses. |
| 5 | **Send the upload's `folder` setting in the web address**, not inside the form. | That's what the API expects. Small, probably not causing any bug. |

---

## 4. Now unblocked — the backend is live

| # | Fix | Status |
|---|---|---|
| 1 | **Connect the NIN form (Innovation and Launch RSVPs only).** | ✅ **Done, 14 Sept.** Two real steps — NIN (with a one-line consent tick box, no date of birth), then a selfie. The RSVP only goes through once the face matches; someone who has already passed goes straight through next time. Not skippable. Needs testing with a real NIN. |
| 2 | **Launch gallery:** show uploaded photos and videos on the Launch event page. Links expire after about an hour, so the page must refresh them if left open. | Needs a design (Q6). |
| 3 | **AGM help email** on AGM pages. It comes back ready to use and never empty. | Needs a spot (Q5). |
| 4 | **Attendee count** on Home cards. | Your answer to Q4, then the backend adding it. |
