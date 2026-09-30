# Backend asks — 2026-09-28

Re: Zoom webinars (your note of 2026-09-26) and proxies.

## Webinars

1. **Proxy email on join.** Zoom requires an email for every webinar joiner ("userEmail: Required
   for webinar" — Meeting SDK reference). You already store each proxy's email at assignment.
   Please return it in the proxy-code join response and in guest `/view`, so proxies don't have to
   type it again.
2. **Plain guests (access code, not a proxy).** Same Zoom rule, but guests have no email on file,
   and your note doesn't cover them. How should they join a webinar?
3. **Meeting ID.** The note says to use `meetingId` instead of reading the number from the join
   link, but neither the participant event detail nor guest `/view` returns it. Please add it, or
   confirm the number in the `zoom.us/w/…` link is the right one to join with.
4. **`zoomType` on guest `/view`.** The note says it's there, but that response is an untyped map,
   so we can't confirm it from the spec. Please confirm.
5. **FYI:** the note says "not yet deployed", but `/api/v1/version` shows a build from
   2026-09-26 19:20 UTC with the webinar endpoints and `zoomType` in the spec.

## Chairman as proxy

We send it as an ordinary proxy: `{ proxyName: "Chairman…", proxyEmail: "", proxyPhone: "" }`.
So no code email goes out, and you can't tell who the chairman actually is.

6. **How are chairman-held proxy votes cast today?** By the chairman joining with each code, or by
   the organiser (e.g. admin proxy-vote upload)?
7. **Proposal:** let the organiser set the chairman's name and email once per AGM (org default +
   per-AGM override, like the support email). We'd send `proxyType: "CHAIRMAN"`; you fill in the
   real chairman, email the code, and group all chairman proxies under that person.
