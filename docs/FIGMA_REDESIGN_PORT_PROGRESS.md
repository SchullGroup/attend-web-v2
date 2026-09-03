# Figma Redesign Port — Progress & Handover

> **Purpose:** Live handover doc for the task of porting the Meristem
> `attend-web-figma-redesign` branch's UI into this repo (branch `redesign`),
> page-by-page. Written so another agent can finish the work if this session
> ends. **Keep this file updated after every page** — check off the page, note
> what changed, and record the next step.
>
> Read [docs/AGENT_CONTINUATION_GUIDE.md](AGENT_CONTINUATION_GUIDE.md) first for
> the broader project handover; this doc is scoped to the redesign port only.

---

## The task in one paragraph

Adopt the figma-redesign branch's **design** wholesale (flat/minimal look),
but **keep this repo's logic, API hooks, types, and functionality**. Where the
new design drops something functional, **re-add it in figma's visual language**
rather than lose it — and flag it. User's exact words: *"i want to use this new
design only. WE RETAIN OUR LOGIC, APIS AND FUNCTIONALITY, highlight wherever
this will be a difficulty."*

**Page order:** Dashboard → Events → AGM → Hackathon → Profile (then subpages as
scope allows).

**Do NOT commit** unless the user explicitly says so. **Do NOT add Claude as a
git co-author.** Do not run `npm run build` while `next dev` is running.

---

## Source of truth (two locations)

| What | Path |
|------|------|
| **figma-redesign branch (DESIGN source of truth)** | `C:\Users\HP\Downloads\meristem-attend-web-attend-web-figma-redesign\` |
| **This repo (target; keep its hooks/types/logic)** | `c:\Users\HP\Desktop\Attend-Project\attend-web\` |

Ignore these sibling extracts — NOT the figma branch, nothing to port:
`meristem-attend-web-master\` (master branch) and `meristem-design-2-main\`
(the `mrpsl-cpa` registrar back-office).

**Method:** For each page, read figma's exact source at the same route path,
then write our page adopting figma's JSX/design while importing OUR hooks/types.
Because the classifier can be flaky (Bash/PowerShell/git sometimes unavailable),
all analysis is done with Read/Glob/Grep, which always work.

---

## KEY FINDING #2 — the BRANCH CODE ≠ the FIGMA DESIGN FILE (Home proved it)

The figma-redesign **branch's page code is not always the design**. The branch's
`(main)/page.tsx` ships a flat "All events" list; the actual Figma design for Home
(node `777-3136`) is a rich **dashboard** (greeting hero + **Live now carousel** +
Discover Events tiles + Upcoming Events row + Browse All banner) that the branch
never implemented. I initially ported the branch's placeholder and (wrongly)
removed the carousel; the user's mockup screenshots corrected this. **Home is now
rebuilt to the design file, carousel restored.**

**Implication for the rest of the port:** for any screen where the branch page is
a stripped placeholder, the branch code is NOT a safe source of truth — the Figma
mockup is. We only have branch code for the subpages (no mockups yet), so port the
branch faithfully BUT flag any page that smells like a placeholder so the user can
supply the mockup. Detail/form pages are far likelier to match the design than the
"hero" Home was.

---

## KEY FINDING — compatibility is clean

Recon (done) confirms **zero type drift and zero hook drift**. Everything
figma's pages import already exists here:

- **Hooks** (all present): `useGetEvents`, `useGetMyEvents`, `useGetSavedEvents`
  (`src/api/events/hooks.ts`); `useGetChallenges`, `useGetMyTeams`
  (`src/api/hackathon/hooks.ts`); `useGetDocuments` (`src/api/documents/hooks.ts`);
  `useGetNotificationPreferences` (`src/api/notifications/hooks.ts`);
  `useGetMe`, `useLogout` (`src/api/auth/hooks.ts`).
- **Types** (all fields figma reads exist):
  - `EventsQueryParams` has `search`, `eventType`, `status`, `page`, `size`
    (`src/types/events.ts:145`).
  - `EventListItem` has `organizerName`, `organizerLogo`, `registerName`,
    `eventType`, `status`, `format`, `date`, `startTime` (`src/types/events.ts:8`).
  - `MeResponse` has `avatarUrl`, `initials`, `fullName`, `phoneNumber`,
    `email`, `role` (`src/types/auth/responses.ts:13`).
  - `DocumentsData.documents` (`src/types/documents.ts:36`);
    `NotificationPreferences` has all six `inApp*`/`email*` flags
    (`src/types/notifications.ts:29`).
- **Shared UI components** are already figma's design, EXCEPT `Button`:
  - `src/components/ui/Input.tsx` — our version is a SUPERSET (adds `prefix`),
    same figma styling. No change needed.
  - `src/components/ui/Badge.tsx` — same variants (`default|success|warning|
    danger|muted|info`). Compatible.
  - `src/components/attend/AgmSubNav.tsx` — **byte-identical** to figma. Exports
    `AgmHero`, `AgmSubNav({active})`, `AgmBackButton`. AGM hub pages route
    Proxy/Receipts/Minutes through this pill row.
  - `src/components/ui/Button.tsx` — **prop API identical**, but styling differs:
    ours `bg-gray-900 font-semibold`; figma `bg-foreground font-medium
    tracking-[-0.14px]` + soft shadow, `sm`/`lg` get `rounded-lg`/`rounded-xl`.
    **DECISION: swap Button's internals to figma's when we first hit a page that
    uses `<Button>` (Profile). It ripples app-wide — that is intended.** Verify
    what `--foreground` resolves to first (near-black is fine).

So each page port = replace the page file + keep our imports. Watch only for the
per-page difficulties below.

---

## Routing gotcha (applies to Home + anywhere linking AGM detail)

Our routes that EXIST: `events/[id]`, `hackathon/[id]`.
**`agm/[id]` does NOT exist** (neither here nor in figma). figma's home links
AGM cards to `/agm/${id}` — that 404s. **Route AGM cards to `/events/${id}`**
instead (this is what figma's own AGM list page does). Comment it inline.

---

## Design-system cheat-sheet (figma flat/minimal)

- Headings: `text-2xl font-medium tracking-[-0.72px] text-foreground`
- Body/labels: `text-sm tracking-[-0.14px]`, muted text `text-foreground/60`
- Cards: `rounded-xl border border-foreground/[0.06] bg-white
  shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]`, hover shadow `...0.08)]`
- Fills/tiles: `bg-foreground/[0.04]`; pastel event tiles use
  `TILE_TINTS = ["#f9b6ff","#8ba6ff","#c3e1d0","#dbe1c3","#f6f6f6","#e2e2e2"]`
  via a `tileTint(seed)` hash; 60×60 `rounded-[10px]` tile w/ logo or module icon.
- Tabs: underline style `border-b-2`, active `border-foreground font-semibold`.
- Amber KYC nudge (figma's own, reuse verbatim): `rounded-xl border
  border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700
  hover:bg-amber-100`, links `/intro`, shown only when `!verified`.

---

## Difficulty register (what the design change costs, + resolution)

1. **Home — Live now carousel.** ~~figma has none; REMOVED.~~ **CORRECTED:** the
   Figma DESIGN FILE (node 777-3136) DOES have a Live-now carousel — the branch
   code that lacked it was a placeholder. The carousel is **RESTORED**. The user's
   original "don't touch the carousel" was right; the earlier removal was my error.
2. **Home — live-event routing.** Live cards route AGMs → `/agm/live?eventId=` and
   everything else → `/events/live?eventId=` (the live rooms). Retained.
3. **Home — KYC nudge → `/intro`.** RE-ADD using figma's own amber nudge style. Done.
4. **Home — greeting hero + Discover tiles.** ~~DROP.~~ **CORRECTED:** both are IN
   the design file — greeting hero ("Good <time>, <name>" + tagline) and the
   Discover Events tiles (AGM/Innovation/Launch) are part of the dashboard. Kept.
   Data gap flagged: the design's "N watching"/"N applied" counts aren't on
   `EventListItem` (only `EventDetail.registeredCount`), so cards show honest
   date/time/live state instead of a fabricated number.
5. **Hackathon — `useGetMyTeams` state-aware CTAs** (Join Live / View
   Application / Apply progression). figma uses simple Apply/View. RE-ADD the
   state-aware CTA in figma styling, else submitted users are stranded.
6. **AGM — per-card Proxy/Pre-vote CTAs.** figma routes these through the
   `AgmSubNav` pill row (present, byte-identical), so entry points survive.
   Confirm at that step; if a per-card action is genuinely lost, re-add it.

Smaller deviations (apply + comment inline):
- AGM home-cards → `/events/[id]` (no `agm/[id]` route). See routing gotcha.
- `useGetEvents({ size: 100 })` on Home so the list isn't truncated by the
  default page size (matches the old home + figma's events page pattern).

---

## Per-page checklist

- [x] **Home / Dashboard** (`src/app/(main)/page.tsx`) — **REBUILT to the Figma
      design file** (node 777-3136), NOT the branch placeholder. Greeting hero +
      **Live now carousel** (restored) + Discover Events tiles + Upcoming Events
      carousel + dark-green Browse All banner. Wired to `useGetEvents`/`useGetMe`/
      `useUserStore`; KYC amber nudge re-added; live cards → `/agm/live` or
      `/events/live`; other cards → `/events/[id]` or `/hackathon/[id]`. Data gap:
      no watching/applied count on the list item, so cards omit it (see register #4).
- [x] **Events** (`src/app/(main)/events/page.tsx`) — DONE (figma verbatim;
      clean adoption. Adds Past + Bookmarked tabs via `useGetSavedEvents`. Old
      commented Gallery/Archive links dropped.)
- [x] **AGM** (`src/app/(main)/agm/page.tsx`) — DONE (figma verbatim; AgmHero +
      AgmSubNav + status tabs + AgmListCard. Per-card Proxy/Pre-vote CTAs dropped
      — they live on `/events/[id]` (`agmProxyEnabled` gate) which every card
      links to, and AgmSubNav covers history/receipts/minutes. Nothing lost.)
- [x] **Hackathon** (`src/app/(main)/hackathon/page.tsx`) — DONE (figma card
      design + RE-ADDED state-aware primary CTA via `useGetMyTeams`: Join Live /
      View Application / Apply Now / RSVP to Apply. figma's "View Details" kept as
      secondary.)
- [x] **Profile** (`src/app/(main)/profile/page.tsx`) — DONE (figma verbatim;
      avatarUrl + edit panel + live counts. All hooks/fields present.)
- [x] **Shared `Button`** (`src/components/ui/Button.tsx`) — swapped internals to
      figma styling (`bg-foreground text-background`, `font-medium tracking`, soft
      shadow, rounded-lg/xl). Prop API unchanged; ripples app-wide by design.
      Theme vars confirmed defined (globals.css) so text isn't invisible.
- [x] **ALL subpages + shared components + primitives** — full-app flat re-skin
      done (2026-09-01). See the "Full-app conversion pass" section below for the
      complete file list, the method used, flagged deltas, and intentional leftovers.

### Per-page recipe
1. Read figma's page at the same route under the Downloads path.
2. Read our current page to capture any functional bits figma drops.
3. Write our page = figma's design + our hooks/types; re-add dropped
   functionality in figma styling; comment every deviation.
4. Keep imports to what's used (Next ESLint fails on unused imports).
5. Update this doc: check the box, note what changed + the next step.
6. Do NOT commit.

---

## Full-app conversion pass (2026-09-01) — "convert the whole app"

After the 5 primary pages, the user said **"convert the whole app."** Every
remaining page, shared component, and UI primitive in scope was re-skinned to the
flat design.

### Method used this pass (IMPORTANT — differs from the 5-page port)

The figma branch is **behind** our functional evolution, so a verbatim page
replace would regress logic. This pass therefore **re-skinned OUR page/component
to the flat design tokens** — swapping classNames only and preserving every hook,
import, state, handler, and conditional — using figma as a *style* reference, not
a source to copy. Concretely, the changes were: token swaps (`text-muted-foreground`
→ `text-foreground/60`, `border-border` → `border-foreground/[0.06]`, `bg-muted*`
→ `bg-foreground/[0.02–0.04]`, old `rounded-2xl`+`shadow-sm` cards → `rounded-xl`
+ figma shadow, `border-input`+`ring-ring` inputs → flat), plus mojibake repair in
visible strings and touched comments. **No logic was changed.**

### Files converted (all logic preserved)

- **Route groups (all pages):** `(main)` incl. every subpage (events/agm/hackathon/
  profile subtrees, onboarding, qr-checkin, notifications, search), `(auth)`,
  `(kyc)`, `(guest)`, and `e/[eventId]`.
- **Shared components:** `NavShell` (app shell — sidebar/header/bottom-nav on every
  main page), `EventCard`, `LiveRoom` (~900 lines; token swaps only, all
  live-voting logic intact), `UploadField`, `FilePickField`, `NomineeBallot`,
  `SourceBreakdown`, `ProxyCastVotes`, `ZoomStage` (video container radius only).
- **UI primitives:** `Input` (adornments/hint muted tones; base was already flat),
  `Button` (outline/ghost fills flattened), `Badge` (muted variant flattened).
- **Root:** `app/layout.tsx` metadata title mojibake (`ΓÇö` → `—`) — user-visible
  (browser tab / SEO / OpenGraph).

### Deltas flagged for the batch review

1. **`NomineeBallot` "Cast Ballot Vote" button** keeps `bg-slate-900` (near-black),
   not the figma primary. Left as-is intentionally (reads as a distinct commit
   action) — **confirm** whether it should become `bg-foreground` (matches the
   default `Button`) or stay slate.
2. **`Button` outline variant** border is now `border-foreground/[0.06]` per the
   cheat-sheet map — this is *very* faint for a button outline. If it reads as
   borderless in `next dev`, bump to e.g. `border-foreground/15`.
3. **`Button` base keeps `focus-visible:ring-ring`** (keyboard-only a11y focus
   ring, kept from the original figma port). Not flattened — inputs dropped their
   ring, buttons did not. Flag if you want it removed/re-toned.
4. **Voting components retain semantic status colors** (emerald = For, rose =
   Against, slate = Abstain) across `NomineeBallot`, `SourceBreakdown`,
   `ProxyCastVotes`, and the `LiveRoom` ballot. Only structural tokens were
   flattened; the vote-choice palette is intentional and unchanged.

### Intentional leftovers (NOT bugs — deliberately not flattened)

- **Brand heroes:** `events/[id]` and `hackathon/[id]` detail headers (brand-colour
  hero + white text) and their matching skeletons.
- **`onboarding`** dark welcome-gradient hero (labelled the "intentional welcome
  moment" inline).
- **`(auth)/layout.tsx`** black split-screen brand panel.
- **KYC icon tiles** using `rounded-2xl` — this is figma-native (the ported
  `verify` page uses the same), *not* an old token. `rounded-2xl` is only an old
  token when paired with `shadow-sm`/`border-border`.
- **`hackathon/certificate`** artwork (`rounded-3xl`, purple border/gradient,
  `text-muted-foreground`) — deliberately outside the flat system; it is
  DOM-snapshotted to PDF and must render as designed.
- **figma-native guest pages** `(guest)/join/*` and `(guest)/layout.tsx` — these
  ARE the reference design; used as the style source, never targets.
- **`NavShell` guest banner** (`bg-slate-900` + emerald pulse) — semantic
  guest-mode chrome.
- **Zoom video stages** stay dark (`bg-slate-900`); only container radius flattened.
- **`.ts` comment mojibake** (api hooks/clients, `types/*`) — comment/JSDoc only,
  no user-facing strings, in files whose logic is preserved untouched. Left as-is.

### Out of scope (untouched by request)

`_landing/*` (marketing site — "do not touch the home carousel"), `zoom-test`, and
the Zoom live-room wrappers (`agm/live`, `events/live` shells).

---

## Progress log

- **2026-09-01** — Recon complete (types/hooks/components all compatible; only
  `Button` styling + 5 page files differ). Handover doc created.
- **2026-09-01** — Dashboard ported. Paused for user review before Events.
- **2026-09-01** — User said "just go on, I'll review all at once." Ported Events,
  AGM, Hackathon, Profile + swapped shared `Button` to figma styling. All five
  main pages now on the new design. Type-clean (only Tailwind canonical-class
  style warnings, bracket forms kept intentionally). NOT committed.
- **2026-09-01** — User said **"convert the whole app."** Re-skinned ALL remaining
  subpages + shared components (`NavShell`, `EventCard`, `LiveRoom`, upload/ballot
  components, `ZoomStage`) + primitives (`Input`/`Button`/`Badge`) to flat tokens,
  logic-preserving (className/mojibake only). Fixed user-visible metadata mojibake
  in `app/layout.tsx`. Deltas + intentional leftovers recorded above. Only Tailwind
  canonical-class warnings remain (bracket forms kept intentionally). NOT committed.

- **2026-09-01** — User supplied four **new** Figma frames (AGM detail: default /
  Pending Approval / live-with-video, plus Pre-AGM voting as a modal). Audit of the
  pulled `meristem-attend-web-attend-web-figma-redesign` export found **none of them
  exist as code there**: no right-hand Agenda/Q&A/Resolution panel on any detail
  page, no "Agenda" tab anywhere (design-source `LiveRoom` has only Q&A + Resolution),
  no Dialog/Modal/Sheet primitive at all, and pre-vote is a plain full-page route.
  So these were built fresh in the flat token language against OUR hooks:
  - **NEW** `components/ui/Dialog.tsx` — portal overlay + `DialogHeader`
    (circular back control, title/description, optional progress bar). Escape +
    backdrop close, body scroll lock.
  - `agm/pre-vote` — now presents as Figma's modal (route kept, so deep links and
    all logic are unchanged: NomineeBallot candidate ballots, proxy gating/revoke,
    vote updating). Header progress bar is real data (answered ÷ resolutions).
  - `events/[id]` (AGM only) — two-column on `lg`, with a sticky
    **Agenda / Q&A / Resolution** side panel (`AgmSidePanel`); the old combined
    "Resolutions & Agenda" body section is now non-AGM-only. AGM actions moved from
    list rows to Figma's 3-up `ActionTile` grid (+ QR check-in tile), live quorum bar
    added via the existing `useGetQuorum`, and the hero gains a play control when the
    session is actually joinable.

- **2026-09-03** — Pre-AGM voting corrected against the supplied frame (KEY FINDING #2:
  the mockup wins, not the branch code and not improvisation). Fixed four deviations of
  mine in `agm/pre-vote`: subtitle back to the frame's single line; caption back to
  "You can update your vote until voting closes." (dropped my "N of M selected" prefix);
  Submit button now always solid black per the frame, with the incomplete-ballot guard
  moved into `submit()` so it explains itself instead of sitting disabled; and `VotedCard`
  re-skinned to the same card shell as `ResolutionCard` (p-4, no shadow, muted
  "Resolution N" row, `text-sm` question) keeping its badge, Change-vote toggle and
  tallies. NOT committed.
  - **Not a bug:** a resolution rendering as "OPEN" is data — `title` passes through
    `normalizeResolution` untouched (it only fills tally counts), and `status` is a
    separate field. That test AGM's resolution is literally titled "OPEN".

- **2026-09-03 (2)** — Pre-AGM voting rebuilt to the frame properly. Two structural
  mistakes fixed: it is a **right-anchored sheet**, not a centred dialog (right edge inset
  from the screen, near full height, content top-aligned so short content leaves white
  space under Submit); and the **event detail page now stays behind it**.
  - `components/ui/Dialog.tsx` gained `side?: "center" | "right"` (default center, so no
    other caller changed). Right = `justify-end`, `p-0 sm:p-3`, panel `h-full max-w-[600px]`,
    square corners on mobile. Header progress bar thinned `h-1.5` → `h-1`.
  - Sheet body extracted to **`components/attend/PreVoteSheet.tsx`** ({eventId, open,
    onClose}) — a pure move, no logic change. Local `open` list renamed `openResolutions`
    to avoid shadowing the prop.
  - `events/[id]` opens it in place from BOTH entry points (the "Pre-AGM Voting" ActionTile
    and the "Pre-Vote" CTA) via `preVoteOpen` state; mounted only while open so its
    resolution/proxy queries do not run until needed. Resolves old delta #7.
  - `agm/pre-vote/page.tsx` reduced to a thin wrapper so direct links still work.
  - **Still to do (user deferred):** Appoint a Proxy should also become a modal, and QR
    check-in gets the same treatment — both explicitly postponed.

- **2026-09-03 (3)** — Appoint-a-proxy given the same treatment as pre-vote.
  - Body extracted to **`components/attend/ProxySheet.tsx`** ({eventId, open, onClose}),
    rendered in `Dialog side="right"`. `agm/proxy/page.tsx` is now a thin route wrapper.
  - `events/[id]` opens it in place from the "Appoint a Proxy" / "Change Proxy" tile via
    `proxyOpen` state; mounted only while open.
  - To the frame: Chairman body copy trimmed to "Your vote follows your pre-vote choices.",
    named-proxy inputs are now **placeholder-only** (no labels), and the footer is
    Cancel + Submit Proxy side by side on desktop / stacked with Submit on top on mobile
    (`flex-col-reverse sm:flex-row`). Cancel now closes the sheet instead of routing to /agm.
  - ALL other states preserved and rendered inside the sheet: assignment-closed lock,
    post-assign code + QR + "View vote receipt", the existing-proxy card with copy/QR/
    one-proxy warning and the two-step revoke, plus the backend disclaimer.
  - **Kept though not in the frame (flag):** the amber 48h-notice, the backend-supplied
    disclaimer, and the error banner — all conditional, and the disclaimer is legal text
    the backend owns. Say the word to drop the 48h notice.

- **2026-09-03 (4)** — Vote receipt + Minutes converted to the same right-anchored sheets.
  - `Dialog` gained an optional **`footer`** slot: with it the panel stops scrolling and
    the body scrolls under a pinned footer (Figma pins Download and lets content clip
    behind it). Without it, behaviour is unchanged.
  - **`components/attend/ReceiptSheet.tsx`** — title/subtitle swapped to Figma's pairing
    ("Vote receipt" / status line), green `BadgeCheck` seal, "Resolutions" demoted to
    `text-sm font-semibold`, vote pills gained their circled icons, Download pinned.
    Keeps docRef/`downloadNodeAsPdf`, copy-reference, proxy card + code + QR + revoke,
    `ProxyCastVotes`, pre-vote/castByProxy flags.
  - **`components/attend/MinutesSheet.tsx`** — hero is now the organiser mark + meeting
    title + "Meeting minutes" (Figma); the redundant in-card letterhead was dropped and
    the finalised date moved into the registrar credit. Keeps sanitized-HTML body,
    403 / not-published states and the DOM-snapshot PDF.
  - Both pickers now **open the sheet in place** (state, no navigation) so the list stays
    dimmed behind it; `?eventId=` still deep-links and is cleared on close.
  - **Not done by request:** tile tints on the pickers (user said ignore).

- **2026-09-03 (5)** — Q&A tab wired to the real endpoint, per the QA frame.
  - The panel tab now renders the moderator note, a "Type your question" textarea and a
    full-width **Send** button, posting via `useSubmitQuestion(eventId)` →
    `POST /api/v1/participant/events/{id}/questions` with `{ content, anonymous }`.
    Inline error + sent confirmation; "Join live session" kept as a secondary action.
  - **CORRECTS earlier delta #6**, which claimed Q&A had "no pre-session data source".
    That was wrong: only the real-time question *feed* is websocket-bound (still
    LiveRoom-only). Submission is a plain REST call and works from the detail page.
  - `AgmSidePanel` now takes `eventId` so it can own the mutation.

- **2026-09-03 (6)** — Resolution tab in the side panel is now a real live ballot.
  - Vote control extracted to **`components/attend/VoteButtons.tsx`** and shared by the
    pre-vote sheet and this panel, so the two can never drift.
  - Each card: `Resolution N` + **Open / Closed / Voted** badge + collapse chevron, the
    question, then For/Against/Abstain. A **CLOSED** resolution shows no buttons (Figma's
    closed frame is title-only); a WAITING one explains it is not open yet.
  - **Countdown** added per the third frame: "Voting open" + a green `1:59m Remaining`
    pill, driven by the open resolution's `secondsRemaining` with LiveRoom's exact
    re-sync-then-tick approach.
  - Choices stage locally and commit via one **Send** (`useCastVote`), matching the
    frame's single button; 409 maps to the proxy-already-voted message.
  - `useGetResolutions` now polls at 5s **only while the event is LIVE** so status and
    timer stay current; no polling otherwise.
  - Removed `fmtWindow`, orphaned by the rewrite.

- **2026-09-03 (7)** — My Applications rebuilt to its frame: it is now a **tab of the
  Innovation Challenges page** (same header + underline tabs, "All" linking back to
  /hackathon) and a **2-up card grid**, replacing the desktop table + mobile list.
  Card = thumbnail, challenge name, status pill, circular chevron.
  - Status tones follow the frame: Submitted=blue, Shortlisted=green, **Rejected=red**
    (was muted, and relabelled from the softened "Not progressed"), **Winner=amber** added.
  - **Thumbnails:** `MyApplicationSummary` carries no artwork, so they come from
    `useGetChallenges({size:100})` matched on `challengeId` (one request, not N+1),
    falling back to a `tileTint` tile. Flyer 403s degrade to the tile.
  - **Winner placement + prize ("2nd place · ₦1M") NOT built — no backend field.**
    `MyApplicationSummary` has no placement/prize; `PrizeTierItem.position/reward" is the
    challenge's prize table and `ApplicationMemberResponse.position` is a member ordinal.
    The Winner badge renders if the backend sends that status; the placement line needs
    a new field.
  - **Dropped from the card (flag):** team name, pathway, submitted date, application
    code and the Lead/Member badge — Figma's card is name + status only. The certificate
    link was KEPT as a card footer since this page is its only entry point.

- **2026-09-03 (8)** — Challenge brief (`hackathon/[id]`) matched to its frame.
  - Content is now a **narrow, LEFT-aligned `max-w-2xl` column**, not the full content
    width — the frame leaves the right half empty.
  - In-content "Back to Innovation" link removed (the frame has none; the shell titles
    the bar instead). It survives on the error state, which has no other way out.
  - Banner shortened to the frame's `aspect-[540/160]` and `rounded-xl`; tabs no longer
    full-bleed; the Challenge Resources row uses a right **arrow** in its circle.
  - `NavShell.SECTION_TITLE` now renders **"About challenge"** for the brief route
    (regex excludes apply/resources/certificate/my-applications/submit).
  - **"120 Applied" NOT built — no backend field.** `ChallengeDetailData` exposes no
    application count; `registeredCount` (event) is RSVPs, not applications, so labelling
    it "Applied" would be wrong. Meta line shows date/time (+ venue when present).
  - **Pathway** stays as tint pills from `tracks: string[]` — the frame shows prose there,
    but it is lorem placeholder over what is really a short-label array.

- **2026-09-03 (9)** — Challenge Resources now opens **on the same page** as a right-hand
  panel, per its frame — no navigation to /hackathon/resources.
  - `hackathon/[id]` gains `resourcesOpen`; the row became `NavRowButton` (same visual as
    `NavRow`, toggles instead of routing). Open state switches the page to the same
    two-column grid + `border-l` divider the AGM panel uses; closed, it stays the narrow
    left column.
  - Panel cards: file-type tile (`fileType` first 3 chars, or "Link"), title, description
    (falling back to MB size), and a **Download**/**Open** action on `res.url`. Fed by the
    `useGetResources(id)` call the page already made — no new request.
  - `/hackathon/resources` route left intact for direct links; `NavRow` still used by the
    "My Application" row.

## Deltas from the new frames (flag for review)

5. **"Pending Approval" state NOT built** — there is no backend field for it.
   `EventDetail.status` only ever yields LIVE / ENDED / other in our code, and no
   approval/registration-status field exists in `types/events.ts`. Building it would
   mean inventing state. Need to know what signal drives it (KYC pending? an RSVP
   awaiting registrar approval? a new backend field?).
6. **Q&A tab has no pre-session data source** — questions only exist inside the live
   room's websocket session, so the tab explains that and offers "Join live session"
   rather than faking an inbox.
7. **Pre-vote modal backdrop** shows the app shell (sidebar/header), not the literal
   event-detail page behind it — the route is not a Next.js intercepting route. Say
   the word if it must visually overlay the detail page itself.
8. **Not visually verified in a browser** — both pages sit behind auth, so this pass
   is type-checked only.

## Next step

**Awaiting the user's single batch review in `next dev`.** Then:
1. Apply corrections in one pass (deltas 1–8 above).
2. `_landing/*`, `zoom-test`, and the Zoom live wrappers remain intentionally untouched.
Do NOT commit unless the user says so. Do NOT add Claude as a git co-author.

