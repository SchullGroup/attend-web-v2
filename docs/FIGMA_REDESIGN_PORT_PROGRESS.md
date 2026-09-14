
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
