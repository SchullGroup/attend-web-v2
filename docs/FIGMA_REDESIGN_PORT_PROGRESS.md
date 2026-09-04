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

- **2026-09-03 (10)** — Innovation apply flow finished against its last two frames.
  - Step 1 shell moved off the bespoke `#f6f6f6` drawer onto the shared right-anchored
    `Dialog` (`side="right"` + pinned `footer`), and the Pathway select is now hidden when
    `tracks.length <= 1` (nothing to choose; the single track is still submitted).
  - **Bug fixed:** step 2 member rows were `bg-white`, which was invisible once the shell
    became a white sheet. Leader + member rows are now `bg-foreground/[0.04]` per the frame;
    the "Add new member" block takes a border instead of a fill so its grey inputs read.
  - "+ Invite members" uses a real `Plus` icon; success modal uses the frame's scalloped
    `BadgeCheck` (fill-primary + white stroke) instead of a circle wrapping `Check`.
  - Success modal deliberately stays a plain fixed overlay, NOT a nested `Dialog` — a second
    `Dialog` would double-bind Escape and the body-scroll lock and close both layers.
  - **Not matched (no data):** "judging begins on 20 Nov" — there is no judging-date field;
    `applicationDeadline` is the *application* deadline, so the copy stays generic.
  - **Not matched (deliberate):** desktop frame keeps "Apply to challenge" as the step-2
    title while mobile says "Add team members" + "Step 2 of 2"; the mobile version is
    self-consistent so `STEP_TITLES[step]` is kept. The "N–M members per team" helper is
    kept too — the only place the limit is stated, and `canSubmit` enforces it.

- **2026-09-03 (11)** — "My application details" modal added to the My Applications cards.
  - Clicking a card now opens a centred `Dialog` (`side="center"`, `max-w-lg` — `cn` runs
    `twMerge` so that overrides the variant's `max-w-md`) instead of routing to the brief.
    Header is inline (title + × on one row) rather than `DialogHeader`, which stacks a
    control row above the title.
  - **No backend work needed:** Team name / Idea title / Team members / Description are all
    already on `MyApplicationSummary` from `useGetMyApplications()`, which this page already
    loads. The card-grid rebuild had trimmed them out of the `apps` map; they are carried
    through again. No extra request, nothing persisted locally.
  - Each section is a bordered read-only `DetailCard` (the modal is white, so a fill would
    not read — same lesson as the apply step-2 rows). Optional sections render only when
    present.
  - **"(You)"** is matched on the signed-in user's email via `useGetMe()`, falling back to
    the member `lead` flag. `TeamMemberItem.lead` means team *lead*, not current user, so
    using it alone would mislabel a member who is not the lead.
  - **Flag:** the card no longer routes to the challenge brief (the frame's modal has no
    link there). The brief stays reachable from the **All** tab.

- **2026-09-03 (12)** — Attendance Certificate rebuilt to its frame — both the sheet shell
  and the artwork itself.
  - Extracted to **`components/attend/CertificateSheet.tsx`** ({challengeId, open, onClose}),
  following the established Sheet convention (`MinutesSheet`/`ReceiptSheet`): `Dialog`
  `side="right"`, Download PDF pinned via `footer` so it never lands in the PDF snapshot.
  `hackathon/certificate/page.tsx` is now a thin wrapper for direct links.
  - **Opens in place** from My Applications' "View certificate" (local state, not a route
  change) — same pattern as every other sheet this session; the corrected right-anchored
  positioning applies here too (not centred).
  - **Old purple card artwork replaced** with the frame's cream/gold design: Attend
  wordmark (`/attend-logo.png`, not retyped text — avoids guessing the brand green hex),
  "Certificate" + "of attendance"/"of achievement", presented-to name, participation line,
  a decorative teal/orange chevron corner, and a circular medal seal.
  - **Fixed an existing fabrication, not just carried it over:** the old artwork's
  signature line was a hardcoded fictitious name ("Dr. Yewande Adeyemi, Chief Innovation
  Officer") with no backing field. Replaced with the challenge's real `organizerName`
  (`useGetChallenge`), falling back to a generic "Event Organiser" label — never a made-up
  person. The frame's two illegible signature names were not reproduced for the same reason.
  - **Share button dropped** — not present in the frame's Download-only footer. Flag if the
  share flow is still wanted elsewhere.

- **2026-09-03 (13)** — Bug: two success badges rendered near-black instead of green.
  `--primary` is `hsl(222 39% 11%)` — a near-black navy, NOT green — so `fill-primary` on
  the `BadgeCheck` icons in the apply flow's "Application Submitted" modal and
  `ReceiptSheet`'s "Vote receipt" header rendered dark, not the green both frames show.
  Fixed both to `fill-emerald-500`, matching the app's existing success-state colour
  (`Badge` variant `success` already uses emerald). Confirmed via
  `grep -rn "fill-primary"` that no other instance remains. Worth a broader check if
  `text-primary`/`bg-primary` shows up anywhere else expecting green rather than the
  actual near-black brand colour — not swept here, only these two confirmed instances.

- **2026-09-04 — Three bug reports, investigated with background Explore agents first,**
  **then fixed against verified findings (not guesses):**
  1. **Zoom: only admin sees others' video — NOT fixable in this repo.** Investigated fully:
     production video is the Zoom Web Client View SDK (`ZoomMtg`, not Component View — that
     only exists in the unused `zoom-test` spike), embedded wholesale via an iframe with no
     custom per-participant rendering anywhere. The one real code finding —
     `ZoomStage.tsx` hardcodes `role: 0` for every user, so this app never grants anyone
     host role — turned out not to be the cause: confirmed with the user that the
     admin/organizer joins via the native Zoom app, not through attend-web. This is a Zoom
     account/meeting configuration issue (attendee video-visibility restriction, or the
     meeting being a Webinar instead of a Meeting) that must be fixed wherever that meeting
     is configured, outside this codebase. **No code changed for this item.**
  2. **Ended events now excluded from every normal browse surface.** Client-side
     `.filter(e => e.status !== "ENDED")` added to: `agm/page.tsx` ("All" tab — Live/Upcoming
     were already correct), `hackathon/page.tsx`, `general/page.tsx`, `search/page.tsx`,
     `events/page.tsx` ("Bookmarked" tab only — All/Past were already correct),
     `profile/saved-events`, and `profile/my-events` (user chose a plain filter over an
     Upcoming/Past tab split — AGMs included). Left untouched, confirmed correct or
     intentional archives: Home's carousels, `events/archive`, `agm/proxy-history`,
     `agm/receipt`, `agm/minutes`, `hackathon/my-applications`.
  3. **Back buttons restored to real history navigation.** New shared
     **`src/hooks/useGoBack.ts`** — `router.back()` when `window.history.length > 1`, else
     `router.push(fallbackHref)` (same guard `NavShell` already used, generalized with a
     fallback). Applied to every control found hardcoded to a fixed route during the
     redesign pass: `events/archive`, `events/gallery`, all five `profile/*` subpages,
     `hackathon/apply` (step-0 back, the sheet's `Dialog onClose`, and the `Gate` helper),
     `hackathon/[id]`'s load-failure state, and the `agm/pre-vote` / `agm/proxy` /
     `hackathon/certificate` sheet route-wrappers' `onClose`. Each keeps its old hardcoded
     target as the fallback, so a cold/direct hit still lands somewhere sane.
     - **Deliberately left alone:** `LiveRoom` "Leave meeting" (should land somewhere known,
       not wherever history points from before joining), guest cross-flow links ("Back to
       sign in", `join`/`join/code`), KYC step wizard (forward/back is step navigation, not
       "previous page"), and dead code (`AgmBackButton` — zero call sites;
       `events/qr-checkin` — confirmed nothing links to it, the real entry point
       `/qr-checkin` already used `router.back()` correctly).

- **2026-09-04 (2)** — Section header pattern + Launches module.
  - **Duplicate heading bug:** the app bar showed a short section label ("Innovation",
    "Launches") while the page ALSO rendered its own near-identical `<h1>` just below,
    so the two stacked and collided with the bar's border. Per Figma, those sections put
    a two-line title block IN the bar. `SECTION_TITLE` in `NavShell` now takes an optional
    `sub`; the bar renders title + tagline, and the duplicate headings were removed from
    `hackathon/page.tsx`, `hackathon/my-applications/page.tsx` and `events/page.tsx`.
    Bar switched `h-16` → `min-h-16` + padding so it grows only for those sections
    (verified nothing offsets against a 64px header). The `sub` is scoped to `p === "/events"`
    so event *detail* routes keep the short "Launches" label.
  - **Sticky header bled content:** it was `bg-black/[0.02]` — a 2% tint, i.e. 98%
    transparent — so scrolled cards showed through it. Now opaque, using the exact opaque
    equivalents of that tint per breakpoint (`#fafafa` mobile / `#f1f1f1` desktop) so the
    tone is unchanged. Comment added so the tint is not reintroduced. Sidebar left as a
    tint (nothing scrolls under it — `main` is offset by `md:pl-[259px]`); mobile bottom
    nav left as `bg-white/95` + blur (deliberate frosted effect).
  - **Launches cards rebuilt to the frame:** extracted an `EventRow` child component (the
    save/unsave hooks bind the event id at call time, so they cannot be looped in the
    parent). Adds a working **bookmark toggle** (top-right, wired to
    `useSaveEvent`/`useUnsaveEvent` — it now actually populates the existing "Bookmarked
    Events" tab) and a **circular chevron** (bottom-right), and prefers real artwork
    (`flyerUrl → bannerUrl → organizerLogo → Rocket`) over the logo-only thumbnail.
  - **"120 Registered" NOT built — no backend field.** `EventListItem` has no
    `registeredCount` (only `EventDetail` does), so the frame's count would need an N+1
    fetch per card or a new list field. Same documented gap as Home's "N watching" and the
    challenge list's "120 Applied".
  - **Kept, not in the frame (flag):** the page-level search box and the
    All/Virtual/Hybrid/In-Person format chips. The frame shows neither on desktop (search
    appears on its mobile frame only). Kept because they are real filtering; one-line
    removal if they should go.

- **2026-09-04 (3)** — Launch detail page IS the live page; details panel added to the
  live room.
  - **Reverses the 2026-09-03 decision** that non-AGM live opens `streamUrl` in a new tab.
    Now: `joinedLive` state swaps the hero for an inline iframe, reusing LiveRoom's exact
    embed (`toEmbedUrl` + the `credentialless` spread + the same `allow` list). CTA reads
    **"Join Live Event"** and disappears once playing, per the frame.
  - **Zoom deliberately excluded from the hero** (user decision): Zoom needs the page
    cross-origin isolated, which forces a full `?coi=1` reload that would wipe the
    "joined" React state. `parseZoomUrl(streamUrl)` truthy → route to `/events/live`,
    which already handles that isolation. AGM still routes to `/agm/live`.
  - **Stream URL now resolved properly:** added `useGetStream(id, live && rsvped)` and
    folded it into `missingStreamLink`, which previously only checked `event.streamUrl` —
    so a live event whose link exists only behind the gated `/stream` endpoint no longer
    shows "Join link not available yet".
  - `NavShell.SECTION_TITLE` now shows **"About event"** on `/events/{id}` (regex excludes
    archive/gallery/live/qr-checkin).
  - **Details panel in the live room:** Speakers + Agenda extracted to shared
    **`components/attend/AgendaPanel.tsx`** (with `PanelCard`, removing the page-local
    copy), now rendered both by the detail side panel and by a new **Agenda tab** in
    `LiveRoom` — so guests and proxies, who land straight in the room and never see the
    detail page, can read the running order. Default tab unchanged
    (`showBallot ? "ballot" : "qa"`); the tab only appears when data exists.
  - **UNVERIFIED (needs a real guest session):** the guest `/view` endpoint is typed
    `ApiResponse<EventDetail>` so agenda/speakers *should* arrive, but that payload is
    known to diverge from the type (it sends `eventTitle`, not `title`). The panel reads
    defensively and hides when empty, but whether guests actually get agenda data is
    untested — the whole point of the request, so worth confirming.
  - Added the Agenda tab for all live rooms, not just AGM (equally useful in a launch);
    say the word if it should be AGM-only.

- **2026-09-04 (4)** — Login page matched to Figma (Dashboard.Webview.Desktop), items 1-3.
  - **Email/Phone toggle removed** in favour of one "Email or Phone Number" field with
    `CircleUserRound` (the icon the design branch used). Safe because the payload already
    sent the same value as `identifier` + `emailOrPhone` + `email` — the toggle only chose
    whether to run `toE164()`. Now the input's shape decides: `looksLikePhone` →
    `toE164`, else trimmed as-is. **No backend or payload change.**
  - Carried over the two mode-dependent behaviours: the `pendingVerifyEmail` handoff now
    gates on `looksLikeEmail(cleanId)` instead of `mode === "email"`, and the
    `justVerifiedEmail` effect pre-fills the single field. `DIAL_CODE`/`stripDialCode` and
    the `cn` import dropped with the toggle.
  - Form area given the light gradient (`(auth)/layout.tsx`) instead of flat white.

  **Item 4 NOT done — blocked on an asset I cannot produce.**
  - `public/auth/phone-mockup-agm.png` is **305x405 actual pixels** rendered at 305x405 CSS
    px — a true 1x asset, which is why it looks soft. A 4x export must come out of Figma;
    upscaling it here would be interpolation and would look worse, not sharper. Drop the
    4x file into `public/auth/` and pointing `<Image>` at it is a one-line change (keep
    `width={305} height={405}` so only density changes).
  - **"Make it slide" is not yet defined.** The user asked for "slide"; they did NOT say
    carousel — that was an inference of mine, corrected. What prompted it: the layout
    renders three progress dots (one white, two at `white/10`). It could equally mean a
    slide-in on load. Confirm before building; a multi-slide reading also needs the other
    slide images, since the repo has exactly one mockup.

- **2026-09-04 (5)** — "Sign in with BVN" link removed from `login/page.tsx` (user circled it
  in a screenshot and said "remove this"). Only the link was removed — `/bvn-recover` itself
  (route + its three API calls) is untouched; it's now unreachable from the UI since nothing
  else linked to it. Say the word if it should be deleted or relinked elsewhere.

- **2026-09-04 (6)** — Guest join flow (`(guest)/join/*`) matched to the "Guest events" +
  "Enter code" frames, and a real functional bug found underneath both screens while doing it.
  - **Bug (confirmed by reading the code + a live curl of the backend):** every event card on
    `/join` linked to `/join/[event.id]`, which is a **legacy** dynamic route whose own comment
    says it's "kept only so old links don't dead-end" — it treats that URL segment as a *join
    code*, not an event id, and redirects to `/guest-join?code=<eventId>` without ever setting
    `eventId`. `/guest-join` then immediately shows "Incomplete invite link" because it has no
    `eventId`. The standalone `/join/code` form hit the same dead end from the other direction
    (bare code, no event). There is no code→event lookup endpoint anywhere in the codebase —
    the only real call is `POST /guest/events/{eventId}/join`, which needs both eventId and
    code together — so neither path could ever complete a join as built.
  - **Fix, per the user's answer** ("it's basically what we have already, just the UI is
    different — when the guest clicks the event, the second screen appears"): cards on `/join`
    now link to `/join/code?eventId=...&title=...` (title is display-only, so the guest can
    see which event they're entering a code for). `/join/code` now reads `eventId` from the
    query string and calls `useGuestJoin(eventId)` directly — the same working call pattern
    already used by `/guest`'s inline cards and `/guest-join` — instead of routing through the
    dead legacy page. Landing on `/join/code` with no `eventId` (e.g. an old bookmark) now
    shows "Select an event" with a link back to `/join`, instead of a form that could never
    submit successfully. Removed the "Have an access code instead? Enter it here" footer link
    from `/join` — it pointed at the same bare-code dead end and there's no backend capability
    to back it.
  - **Left alone:** `/guest` (the AGM/General/Launches tabs page) — a separate, already-working
    implementation of the same idea, reached only via `/guest-join`'s own fallback links, not
    from `/login`. Not part of the frames shown this round; flagging that it now duplicates
    `/join`'s purpose in case it should eventually be merged or retired.
  - **Not built:** per-card "Applied"/"Registered" counts shown in the Figma mock. Verified via
    a live `curl` against `GET /api/v1/guest/events` that the endpoint returns only
    `branding{brandColor,logoUrl}`, `date`, `eventType`, `id`, `startTime`, `title` — no
    capacity/registration numbers, and no `flyerUrl`/`bannerUrl` either (despite one of the two
    competing `GuestEventListItem`/`GuestEvent` types in this codebase claiming otherwise).
    Cards keep the existing brand-colour block + logo/initials treatment; grid bumped to 3
    columns on `lg` to match the frame's density.

- **2026-09-04 (7)** — Login item 4 ("make it slide") finished: it's a 3-slide auto-advancing
  carousel, confirmed by the user against three new frames. New
  `components/attend/OnboardingCarousel.tsx` (client component, owns its own timer so
  `(auth)/layout.tsx` stays a server component) — cycles every 5s through AGM / Launches /
  Innovation Challenges slides, each with its own headline, subtext, and phone screenshot; the
  three progress dots (previously hardcoded to the first one lit, decorative only) now track
  the active slide.
  - Assets: user dropped `public/auth/onboarding slider image {1,2,3}.png` in; renamed to
    kebab-case (`onboarding-slide-{1,2,3}.png}`) for URL safety, matching the folder's existing
    convention. **Caught mid-session:** the first two exports both showed the AGM screen — user
    re-exported slides 2/3 correctly (Launches, Innovation) before I built against them.
  - The three exports have two different native aspect ratios (0.795 vs 0.741), so each
    phone-image slot uses `fill` + `object-cover object-top` in a fixed-size box instead of the
    old fixed `width`/`height` Image props, which would have distorted one set.
  - **Slide 3's subtext is a verbatim copy of slide 1's**, per the frame — reads as a
    Figma copy-paste miss under an innovation-themed headline, but the user explicitly chose
    "copy the frame verbatim" over writing new copy when asked.
  - Dots are auto-only (not clickable), matching their original decorative-only markup; say the
    word if they should become clickable slide controls.

- **2026-09-04 (8)** — AGM identity verification rebuilt to its four new frames as modals, and
  the old full-page KYC wizard **retired into the same component**. User's call, verbatim:
  *"lets not have 2 kyc flows, just one. the new modal design."*
  - New `components/attend/VerifyIdentitySheet.tsx` — three stages in one component:
    **BVN** (white) → **Face Registration** (dark panel, tap-to-capture per the frame) →
    **You're Confirmed!** (green `BadgeCheck`, `fill-emerald-500` — *not* `fill-primary`, which
    is the near-black navy that caused the 2026-09-03 (13) bug).
  - **API calls are unchanged** — step1 (BVN + DOB) → step2 skip → `bvn-selfie/v2` match →
    step3, with the same 503 / "already verified" / `data.valid`-is-the-real-result handling
    the old `/liveness` page had. The BVN for the selfie re-check is still read from
    `GET /participant/kyc`, never persisted client-side (NDPA).
  - **DOB kept** per the user's instruction to carry over the info we already collect. The
    frame shows only a BVN field, but step 1 verifies the BVN *against* a date of birth —
    dropping it would break the lookup the modal exists to do. NDPA/CBN consent checkbox +
    disclosure carried over too (it gates submit, as before).
  - **CHN left out** of the UI per the user's choice, and settled with the existing
    `step2/skip` endpoint behind the scenes so KYC can still reach "complete".
  - **Entry points:** the AGM detail page's amber banner "Verify" now opens the sheet in place
    instead of routing to `/bvn`. Per the LIVE frame's dev note, it also **auto-opens** for an
    unverified user landing on an AGM already in session, with the LIVE NOW badge and "join
    immediately" copy; dismissing sets a flag so it doesn't immediately re-open.
  - **Bug caught before shipping:** the auto-open first read `kycStatus` from the user store,
    which starts at "none" from localStorage until NavShell syncs it — that would have flashed
    the modal at already-verified users and then left it stuck open. It now waits on the KYC
    query itself and only ever opens, never force-closes (closing on "verified" would yank the
    panel away before the user sees the confirmation stage).
  - `/intro`, `/bvn`, `/chn`, `/liveness` are now **thin wrappers** (`VerifyIdentityRoute`)
    around the same sheet, so Profile / Home / the onboarding checklist / the AGM gate all show
    the new design and **no URL breaks**. `(kyc)/layout.tsx` lost its 3-step progress bubbles
    (the sheet carries its own stage progression); `/success` keeps the card and is untouched —
    it still covers the rejected / pending-review states the modal doesn't.
  - **Now-orphaned, deliberately left in place:** `resumePath`, `completedStepCount`,
    `KYC_STEP_PATHS`, `getStoredSelfie`, `setStoredSelfie` in `lib/kyc-progress.ts` have no
    callers any more (the sheet resumes by reading `steps.step1.completed` itself).
    `purgeLegacyStoredBvn` and `clearKycProgress` are still live. Safe to delete the five dead
    ones; not done in the same pass as the refactor.
- **2026-09-04 (9)** — *"we should still make it that a user cant join an AGM without Kyc."*
  Every path into an AGM now runs through a KYC check that opens the sheet instead of
  proceeding. On `events/[id]`: `requireKyc()` wraps **Join Live Event** (hero play button,
  primary CTA, and the side panel's own join), **Pre-Vote** (CTA button — it was ungated, the
  action tile was already behind the banner), and **RSVP** — an AGM RSVP *is* the attendance
  confirmation the modal promises ("your AGM attendance is confirmed"), so it can't be handed
  to an unverified user.
  - The gate **fails closed**: an unresolved KYC query reads as "not verified", so a click can
    never slip through while the status is still loading. That's deliberately the opposite of
    the auto-open in (8), which waits for a real response so it can't flash at verified users.
    Both conditions now come from the KYC query rather than the localStorage-seeded store, and
    the AGM Actions banner reads the same `kycFull` so the banner and the gate can't disagree.
  - `agm/layout.tsx` stays the backstop for direct links (`/agm`, `/agm/live`, pre-vote, proxy,
    receipt, minutes) — including the Home page's live cards, which link straight to
    `/agm/live` and never touch the detail page. Its "Start verification" now opens the sheet
    in place instead of routing to `/intro`, and it reads the query *in addition to* the store
    so a resolved FULL_KYC unblocks immediately (it can only ever unblock — still fail-closed).
  - **Checked, no hole:** `/qr-checkin` only *displays* the user's ticket QR — staff scanning
    it is what records attendance — and the ticket comes from `useGetMyTicket`, which needs an
    RSVP that is now itself gated. Both links to it already sat behind the KYC banner.
  - ⚠️ **This is all client-side.** It stops the UI handing out AGM access, not a crafted API
    call. Whether the backend independently rejects RSVP/stream/vote for a non-FULL_KYC
    participant is **unverified** — I couldn't test it without an authenticated session. If it
    doesn't, that's the real fix and this is only the front of it.

  - **Not changed:** nothing else — `agm/layout.tsx`'s link-to-`/intro` complaint from (8) is
    resolved by this entry.

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

