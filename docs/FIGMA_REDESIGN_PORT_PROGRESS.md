
- **2026-09-14 (43)** — **Performance pass, on request ("optimize this site to load faster and
  smoother").** Audited first — bundle composition, image handling, query config, polling,
  lazy-loading — before touching anything. Three real, verified, safe wins shipped; the rest is
  either already fine or needs a decision, both listed below.

  **Fixed:**
  1. **Poster fallback images converted PNG → WebP + switched to `next/image`.**
     `hero-card-auditorium.png`/`hero-card-workshop.png` (867KB/765KB — the wrong format for a
     photograph) → `.webp` at quality 78 via `sharp` (already an installed dep, no new tooling):
     **63KB/53KB, ~93% smaller, same look.** Verified file-size before/after, not estimated.
     Both render sites (`(main)/page.tsx` `CardArtwork`, `EventBanner.tsx`) switched from a raw
     `<img>` to `next/image` at the same time, so Next also serves a resized variant to a ~340px
     Home card instead of the full 1180x436 frame. Old PNGs deleted — confirmed zero remaining
     references first. These are the fallback shown whenever an event has no flyer or logo, so
     they can appear on **every** Home card and **every** bannerless detail page.
  2. **`ReactQueryDevtools` no longer ships to real users.** It was imported and rendered
     unconditionally in the root `QueryProvider` (wraps the whole app, `app/layout.tsx`) —
     `initialIsOpen={false}` only kept the panel closed, it did not stop the devtools bundle
     shipping to every visitor on every page, nor stop anyone from opening it and reading live
     query keys and cache contents. Now gated on `process.env.NODE_ENV === "development"`, which
     is statically known at build time — the branch is fully eliminated from the production
     bundle, not just hidden behind a runtime flag.

  **Checked and already fine — no change made, noted so nobody "fixes" it again:**
  - The three onboarding auth images (`phone-1/2/3.png`, ~850-1000KB source) already go through
    `next/image` with a correct `sizes="342px"` — Next serves the small optimized variant at
    request time regardless of source size. Not a real issue despite the large source files.
  - `jsPDF` and `html2canvas-pro` (both sizeable libraries) are already dynamically imported
    inside `dom-to-pdf.ts`'s `downloadNodeAsPdf`, only loaded when a user actually exports a PDF —
    not in the initial bundle for Minutes/Receipt/Certificate pages. Already correct.
  - The Zoom Web SDK loads inside `zoom-meeting.html`, a separate static page only fetched inside
    the live-room iframe — it was never part of the app's own bundle or a normal page's load.
  - `NavShell`'s KYC-status fetch on every authenticated page is deduped and cached by React
    Query's 60s `staleTime` — one request per minute across the whole app, not per page.

  **Bigger opportunity, flagged rather than done — needs a decision:**
  `next.config.ts` has **no `images.remotePatterns`** configured at all. That's *why* 11 of the 13
  raw-`<img>` files in the codebase exist: every user-uploaded logo, flyer, banner and avatar
  comes from Cloudinary or the Huawei OBS bucket, and `next/image` refuses an unlisted remote host
  outright. Adding `remotePatterns` for both hosts would let those switch to `next/image` too —
  real-world flyers/logos are often multi-MB uploads with no resizing today. Bigger and riskier
  than today's pass: touches ~10 files, and OBS still has no CORS header (tracked separately,
  `BACKEND_ASKS_2026-09-10.md`) — worth confirming that's a non-issue for `next/image` specifically
  (its fetch is server-side, not a browser `fetch`) before doing this at scale. Also unactioned:
  the ~1.9MB of `/public/posters/*` files with zero references anywhere in `src/` (repo bloat, not
  a runtime cost — nobody fetches an unlinked file) and the 8+ unused-dependency check
  (`docx` appears in `package.json` with zero import sites).

  `tsc` clean. Smoke-tested `/`, an event detail page and a challenge detail page against the
  running dev server post-change — all 200, no runtime errors. Not verified: an actual production
  `next build` bundle-size comparison (didn't want to stop the user's running dev server for it
  without asking) and a real Lighthouse/PageSpeed pass.

- **2026-09-15 (44)** — **Two reported bugs fixed on the AGM side, found in a build from a session
  I don't have transcript for** (the media gallery / `EventMediaGallery` / `event.launchMedia` /
  "Contact us" support-email pill visible in the screenshots are all new since I last touched this
  page — `git log` traces them to `c208385`).

  1. **Duplicate flyer banner on the detail page.** For AGM and Innovation, the same flyer image
     rendered **twice**: once cropped inside the hero (`EventBanner`), once again further down at
     full size, uncropped (`events/[id]/page.tsx:613-632`). The second copy was added earlier on
     purpose — a wide crop can clip a flyer's logo/date text — but it read exactly as reported: two
     near-identical banners on one page. Removed. Launches/General never had this second copy and
     were never missing content for lacking it, so AGM/Innovation now match them: the flyer shows
     **once**, in the hero. If a specific flyer's crop is actually losing real content, that's a
     hero-crop fix, not a reason to repeat the whole image.
  2. **AGM list showing the flyer instead of the company logo.** `AgmListCard`
     (`agm/page.tsx:126`) called `EventThumb` with no `fit`, defaulting to `fit="cover"` —
     flyer-first ordering, same as Home. For an AGM with a banner-style flyer that reads as an
     illegible cropped sliver in a 60px tile. Added `fit="contain"`, which already existed on
     `EventThumb` (built for the Settings lists) and switches to logo-first ordering
     (`branding.logoUrl → organizerLogo → flyerUrl`). **Deliberately the opposite of Home's
     cards**, which fill with the flyer on purpose — a shareholder scanning the AGM list is
     matching a company by its mark, not by banner art.

  Neither fix touches `EventMediaGallery` or the teaser video — both are correct and unrelated to
  either report.

  `tsc` clean. Not verified in a browser this session — the dev server from earlier isn't running,
  and the user has their own instance up (that's the source of the screenshots).

- **2026-09-15 (45)** — **Flyer banner gets a blurred backdrop instead of a crop**, on request
  (reference: an AGM notice poster and a "Launching soon" square, both shown centred over a
  blurred, zoomed copy of themselves). `EventBanner`'s flyer tier was plain `object-cover`, which
  is exactly what forced the duplicate-banner hack removed in (44) — a portrait/square flyer got
  cropped, clipping the logo or date, so a second uncropped copy was added elsewhere on the page
  as a workaround. This fixes the actual cause instead: two stacked layers, the same flyer twice —
  a `blur-2xl scale-125 object-cover` copy filling every edge of the frame, with the real flyer on
  top at `object-contain` so nothing is ever cropped. `scale-125` pushes the blur's own soft edge
  outside the frame so no lighter fringe shows at the boundary.

  **Deliberately not applied to tier 2 (the logo)** — the file already carries a comment from an
  earlier attempt explaining why: blurring averages the whole image, so a black-backed logo came
  out washed-out purple-grey. That tier keeps sampling the logo's real background colour instead.
  A flyer is a full-bleed design meant to read well blurred; a logo is a mark on a flat background
  and isn't. Tier 3 (stock poster) is untouched — landscape source, no aspect mismatch to solve.

  `tsc` clean. Not verified in a browser — no dev server running this session.

- **2026-09-15 (46)** — **"Upcoming" now checks the actual date, not just status; banner flyer
  shrunk with visible blur margin.**

  **The date fix.** Confirmed by reading every "upcoming"/"not ended" filter in the app (7 pages
  + one shared helper) — every single one trusted `status` alone (not ENDED, not LIVE, not
  CANCELLED), never comparing the event's real date/time against now. So an event whose date had
  passed, but whose backend status was never flipped to LIVE/ENDED, sat in "Upcoming" forever.

  New `isEventCurrent(event, { excludeLive })` + `compareByStartAsc` in `lib/rsvp.ts`, next to the
  existing `parseEventStart`/`getRsvpEligibility` this reuses. Deliberately **not** touching
  `getRsvpEligibility` itself — that one is correct to stay status-only, since the backend really
  does keep accepting RSVPs past an event's nominal start until someone changes its status; a
  clock check there would incorrectly block a still-open RSVP. This is a different question:
  which section a card sits in.

  Two shapes needed different treatment, so `excludeLive` exists:
  - **Strict Upcoming tabs with their own separate Live section** (Home, AGM's Upcoming tab, the
    event detail page's own `isUpcoming` which feeds the Launch countdown widget) —
    `excludeLive: true`.
  - **Merged "not ended" lists with no Live section of their own** (Innovation, Search, General,
    Launches, My/Saved Events) — `excludeLive: false` (default). A currently LIVE event must stay
    here regardless of its start time already being in the past — that's what LIVE means, and
    excluding it would make it vanish from the only list it appears in.

  Sorted soonest-first everywhere this touched, since none of these lists sorted by date at all —
  **except Search**, left unsorted on purpose: it's ranked by relevance to the query, not a
  chronological browse list. "Past"/"Attended" tabs are untouched everywhere — those stay
  backend-authoritative, matching the reasoning already on record for `eventTabs.ts`'s Attended tab.

  **The banner fix.** `EventBanner`'s flyer tier: the sharp foreground copy shrank from
  `inset-0` to `inset-[8%]`, leaving the blurred backdrop from (45) visible on every side instead
  of a flyer whose own aspect ratio could fill the frame edge to edge and hide the blur entirely.
  One shared component, so this — and the earlier blur — apply to Innovation/Hackathon detail
  pages automatically; confirmed by reading `hackathon/[id]/page.tsx`, which renders the same
  `<EventBanner>` and has no separate flyer code of its own to duplicate the fix into.

  `tsc` clean, confirmed no unused imports across all eight touched files. Not verified in a
  browser — no dev server running this session.

- **2026-09-15 (47)** — **Receipts/Minutes pickers now show the company logo; banner blur
  increased.**

  `agm/receipt` and `agm/minutes` each hardcoded a plain grey building icon on every row,
  regardless of which company the AGM belonged to — never reading the event's logo at all (same
  root cause class as the AGM-list bug fixed in (44), just never touched then because these are
  separate files, not `AgmListCard`). Both now use `EventThumb` with `fit="contain"`, matching the
  AGM list card exactly. `proxy-history` was checked and left alone — its row isn't a company-logo
  slot at all, it's a small circular icon marking "this is a person" (the appointed proxy), which
  is correct as drawn.

  `EventBanner`'s blurred backdrop bumped from `blur-2xl` to `blur-3xl` (Tailwind's next step up,
  40px → 64px), on request — the shrink in (46) made the backdrop visible; this makes it stronger.

  `tsc` clean. **Also worth recording:** the "isEventCurrent is not a function" error the user hit
  after (46) was a stale Turbopack dev-server cache (their own overlay read "Next.js 16.2.7
  (stale)") — confirmed the export was present and correct on disk, so no code was at fault;
  resolved by restarting their dev server.

- **2026-09-15 (48)** — **Receipts/Minutes text was centred, not misaligned by content — root
  cause was the element type.** Both rows are a `<button>` (they call `onSelect` rather than
  navigating); a `<button>` centres text by default in every browser, and nothing in this app's
  reset overrides that. `AgmListCard` on the AGM list uses the *identical* title/date markup
  inside a `<Link>` (an `<a>`), which has no such default — so the same JSX rendered left-aligned
  there "for free" and centred here. Added `text-left` to both buttons' className; no change
  needed on the AGM list.

  **On the missing organiser logos in the same screenshot: not a bug.** Confirmed directly from
  the user's own two screenshots — "Martins Proxy test" shows the same plain grey fallback icon on
  the *working* AGM list too. Receipts/Minutes are pulling up mostly QA/test AGMs
  ("Test Pipeline", "Proxy Code Test", etc.) that were never given a logo or flyer; the fallback is
  correct. `EventThumb` wiring is identical and shared with the AGM list, already confirmed
  working in (44).

  `tsc` clean.

- **2026-09-15 (49)** — **Fixed my own regression from (46): the flyer was being cropped, not
  shrunk.** `EventBanner`'s sharp foreground flyer had `inset-[8%]` with no explicit height/width,
  on the reasoning that all four inset offsets set would make the browser auto-stretch it to fit —
  true for an ordinary `<div>`, **not reliably true for `<img>`**, a "replaced element" with its
  own intrinsic size. Without an explicit size it rendered close to its natural pixel dimensions,
  and the parent's `overflow-hidden` silently cropped whatever spilled out — for a tall/portrait
  flyer in the wide short banner frame, that meant only the top slice stayed visible and the rest
  (tagline, venue, date) was chopped off at the frame's bottom edge. Fixed with explicit
  `h-[84%] w-[84%]` (100% − 8% − 8%) alongside the inset, sidestepping the replaced-element sizing
  quirk entirely rather than relying on it.

  **Noted, not fixed:** the blurred backdrop looked flat pale pink/lavender rather than an obvious
  teal blur in the report screenshot. Likely explanation, not fully confirmed: the backdrop uses
  `object-cover` on a portrait flyer inside a wide-short frame, which crops toward the image's
  *vertical middle* — for this particular flyer that middle band is mostly plain background, not
  the teal graphics concentrated near the top. That crop choice is unrelated to the sizing bug just
  fixed and may persist independently; flagged to check once the crop bug's fix is visible, rather
  than guessed at further without seeing it.

  `tsc` clean.

- **2026-09-15 (50)** — **Banner backdrop confirmed as the flat-pink issue flagged in (49); fixed.**
  `object-cover`'s default crop position is centre, and for a tall flyer squeezed into this wide,
  short banner that crop keeps only the flyer's vertical *middle* — the plainest part of a typical
  flyer, since the graphic header/logo sits near the top and the fine-print venue/date sits near
  the bottom (true of every reference flyer seen in this thread). That's why the blur read as a
  flat, unrecognisable pastel instead of visibly "the artwork, blurred." Added `object-top`, so the
  crop anchors to the part of the flyer that actually carries colour and graphics.

  `tsc` clean.

- **2026-09-15 (51)** — Banner backdrop blur bumped again: `blur-3xl` (64px, Tailwind's built-in
  max) → `blur-[90px]`, on request. An arbitrary value since 64px was already the largest named
  step.

- **2026-09-15 (52)** — Blur reverted to `blur-3xl` (64px) per request. Innovation list
  (`hackathon/page.tsx`) switched to `fit="contain"` — organiser logo, same treatment as the AGM
  list, instead of the flyer/teaser image filling and cropping each tile. `tsc` clean.

- **2026-09-15 (53)** — Two changes, both requested:
  1. **Logo made bigger** — removed the `p-1.5` padding `EventThumb` put around a `fit="contain"`
     image. It now fills as much of the tile as its own aspect ratio allows; `object-contain`
     still guarantees it's never cropped or stretched. Since this lives in the shared
     `EventThumb`, it also enlarges the logo on every other list already using `fit="contain"` —
     AGM, Receipts, Minutes — not only Innovation. Flagging that as a side effect, not something
     asked for on those three, but consistent with them and not worth a special case to avoid.
  2. **Launches and General switched to the organiser logo** — `fit="contain"` added to
     `EventListRow`, the one component both pages share, so both picked it up from a single edit.
     Matches AGM/Innovation now; previously these two filled the tile with the flyer/banner.

  `tsc` clean.
