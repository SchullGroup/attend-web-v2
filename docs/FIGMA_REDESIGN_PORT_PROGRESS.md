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

- **2026-09-06 (10)** — NIN verification at the Innovation / Launch RSVP point, per the four
  new frames. Same three-modal design as BVN, so it is the **same component**:
  `VerifyIdentitySheet` gained `mode: "bvn" | "nin"` (+ `contextLabel`) rather than a second
  copy of a flow we just finished de-duplicating.
  - `mode="nin"` collects **only the 11-digit NIN** — no DOB, no consent block (both exist for
    BVN because step 1 verifies the BVN *against* a date of birth under an NDPA/CBN consent;
    NIN has no such lookup to satisfy). USSD hint is `*346#` vs BVN's `*565*0#`, and the
    confirmation drops the word "AGM" to match the frame exactly.
  - **No backend exists for NIN yet**, so nothing is submitted: stage 1 advances locally,
    the face capture is played and discarded, and the sheet resolves to "You're Confirmed!".
    Per *"keep it so it doesnt block users"*, completing it hands control back to
    `doRsvp()` and the RSVP proceeds exactly as before — the sheet decides **when it is
    shown**, never whether the RSVP is allowed. Closing it cancels, as a modal should.
  - **The NIN is never persisted** — component state for the life of the modal, then gone.
    Same rule the BVN follows (NDPA); no localStorage, no sessionStorage.
  - **Added beyond the frames:** an "I'll do this later" link on the NIN face stage only. A
    camera that won't open must not be what stops someone RSVPing to an event whose
    verification isn't wired up yet. The AGM/BVN path deliberately has **no** such escape.
    Remove it if unwanted — it's one block in the face stage.
  - **Trigger set** (confirmed with the user, whose message said "innovations" while the
    frames read "product launch" — it's both): `mod === "HACKATHON" || mod === "LAUNCH"`.
    AGM keeps BVN; GENERAL events RSVP unverified as before. Copy follows the module
    ("this challenge" / "this product launch").
  - **Coverage checked:** `useRsvp` has exactly one call site in the whole app
    (`events/[id]/page.tsx`), and the hackathon list's "RSVP to Apply" routes to that page
    rather than RSVPing itself — so there is no second RSVP path that skips this.
  - ⚠️ **Unrelated, found while working:** `public/auth/SpotifySetup.exe` — a 1MB Windows
    executable sitting in the public folder, untracked and *not* gitignored. It would be
    committed and then served at `/auth/SpotifySetup.exe`. Left in place (not mine to
    delete); almost certainly a stray download that wants removing.
    **Resolved** — the user moved it to `Downloads/SpotifySetup (1).exe`.

- **2026-09-06 (11)** — Profile rebuilt as **Settings**, to the five new frames. Two panes on
  desktop (list left, section right), and per the user's explicit ask it is **all one page**:
  *"Can we keep them all in the same page?"*
  - **Six sub-routes deleted** (`profile/{my-events,saved-events,documents,notification-preferences,change-password,help}`)
    and their bodies moved into `src/components/attend/profile/*Panel.tsx` — the same
    extract-to-component pattern used for the AGM sheets and VerifyIdentitySheet. **All logic
    carried over verbatim**: the documents download still goes through the counted
    `/documents/{id}/download` with its bare-URL fallback, and notification prefs keep the dirty
    baseline, the `beforeunload` guard and the `UNAUTHORIZED` code branch.
  - Selection lives in **`?section=`**, not plain state, so browser back still steps between
    sections and a section stays linkable. Only one link in the app pointed into the old
    sub-routes (`notifications/page.tsx`) — repointed at `/profile?section=notifications`.
  - **Bookmarks to the old sub-paths now 404.** Nothing in-app links to them; add redirect
    wrappers if that matters.
  - New `PanelShell` (circular back arrow + heading + underline tabs), `EventRowList` (the
    frame's compact row; chevron on My Events, filled green bookmark on Saved), and
    `eventTabs.ts` (shared tab filter).
  - `NavShell`: sidebar item `Profile` → **Account**, app-bar title `Profile` → **Settings**.

  **Three gaps the frames assume and the backend doesn't have** — all settled with the user:
  - **No profile-update endpoint.** Added `authClient.updateProfile` → `PUT /api/v1/auth/me`
    plus `useUpdateProfile`, **marked ⚠️ ASSUMED in the client**. It 404s until backend adds the
    route; per the user's instruction the form shows *"Couldn't save your changes. Please try
    again later."* rather than a raw error. `UpdateProfileRequest` sends `fullName` **and** the
    split `firstName`/`lastName` since the accepted shape is unknown. The avatar picker works
    today (`uploadClient.upload` → Cloudinary) but persisting the URL needs the same endpoint.
  - **No `username`.** `MeResponse` has none and nothing in the app references one. The frame's
    `@handle` and Username field are **omitted**; the header shows the **email** instead.
  - **No `attended`/`checkedIn` on `EventListItem`.** "Attended" is approximated as
    **ENDED + `hasRsvped`** — which over-counts a no-show who RSVP'd. It is also the **only**
    place ended events are shown since the hide-ended pass; every other tab keeps that filter.
    See the comment on `filterEventsByTab`.

  - **Kept though the frames omit them:** the **Sign out** row (the sidebar menu carrying
    sign-out is `hidden md:block`, so on mobile this row is the only way out of a session) and
    the amber **KYC nudge**.
  - **Added beyond the frames:** a discard-confirm when leaving Notification Preferences dirty.
    Closing a panel is no longer a navigation, so the existing `beforeunload` guard can't fire —
    without it, unsaved toggles vanished silently.
  - ⚠️ **Minutes / Certificates tabs may sit empty.** Filtering is on `documentType`, and the
    real values the backend sends are unconfirmed (the old page only ever matched
    notice/agenda/report/proxy). Matching is substring + case-insensitive so `MEETING_MINUTES`
    would still land correctly.
  - **Verification:** `tsc --noEmit` clean; dev server compiles. `/profile` redirects to login
    before rendering, so **the page was not rendered with a real session** — the two-pane
    layout, tabs, avatar upload and save-failure copy all still need a browser pass.

- **2026-09-06 (12)** — The three remaining Settings panels finished to their own frames.
  - **Notification Preference — rebuilt, and it is now lossy by design.** The frame shows four
    rows and no save button. Mapping agreed with the user: RSVP / Event Reminder / New Document
    drive the three `inApp*` flags, and **"Email Notification" is a single master over all three
    `email*` flags**. ⚠️ Consequence: the email flags can no longer be set individually here, so
    a user with a mixed email setup (say reminders on, receipts off) will see it collapse to
    all-on or all-off the first time they touch that switch. Nothing is dropped silently — all
    six flags are still sent on every save.
    - **Saving is now per-toggle** (the frame has no button), replacing the dirty-baseline,
      `beforeunload` guard and the discard-confirm added in (11) — all now unnecessary since
      nothing is ever left unsaved. A failed save **reverts the switch** so it can't display a
      value the server rejected; the `UNAUTHORIZED` branch is kept.
    - Switches are **`bg-emerald-500`**, per the frame — deliberately not `bg-primary`, which is
      the near-black navy behind the 2026-09-03 (13) bug.
    - ⚠️ **Caught while wiring:** my first pass had the in-app toggles trigger the browser push
      subscription. That was wrong — `NEXT_PUBLIC_VAPID_KEY` is **unset in every env file**, so
      `usePushSubscription.toggle(true)` always bails at the "not available on this environment"
      branch, *but only after firing a `Notification.requestPermission()` prompt*. Flipping
      "RSVP" would have popped an unexplained OS permission dialog that then did nothing. The
      panel now writes only the stored `pushEnabled` preference (it follows "any in-app row is
      on"); the real subscribe UI stays on `/notifications`, which has room to explain itself.
  - **Change Password** — frame copy ("Enter your current password and proceed to creating a new
    one"), Title Case labels, "Password" placeholders, `Update Password`. The eye toggle was
    already built into `Input`. All logic untouched, including the sign-out-after-change.
  - **Help** — panel title is **"Help & FAQ"** (the settings *row* stays "Help & Support", as the
    frames show). The two contact cards became `Email us` / `Call us` rows with chevrons.
    Contact details **differed between the desktop and mobile frames**
    (`contact@meristemng.com` vs `hello@experienceattend.com`); the user chose
    **hello@experienceattend.com**, phone `0800MERISTEM` (dialled as `0800637478` — the letters
    keypad-mapped, otherwise `tel:` does nothing).
  - **Help & Support row subtitle** — the frames repeat *"Change your account password"* here,
    duplicating the row above. Raised it as a likely copy-paste slip; **the user chose verbatim**,
    so that is what ships. Comment in `profile/page.tsx` records why.

- **2026-09-06 (13)** — AGM list cards showed the **registrar's** logo, not the company's.
  User: *"can this carry register logo instead and not registrar?"*
  - `AgmListCard` (`agm/page.tsx`) picked `e.organizerLogo` on its own, while taking its *name*
    from `registerName || organizerName`. So every row paired the company's name with Meristem's
    mark. Now `e.branding?.logoUrl || e.organizerLogo`.
  - **Evidence this is the right field**, not a guess: every other surface in the app already
    resolves logos in that order (`guest/page`, `join/page`, `general/page`, `LiveRoom`,
    `MinutesSheet`, `EventRowList`) — the AGM card was the sole outlier. `MinutesSheet` settles
    it outright: its hero uses `branding.logoUrl` for the company, and `organizerLogo` appears
    only in the small *"Registered by {organizerName}"* attribution credit, with a comment
    saying so. **`organizerLogo` is the registrar; `branding.logoUrl` is the company.**
  - ⚠️ **No dedicated register-logo field exists.** `EventListItem` declares only
    `organizerLogo` and `branding.logoUrl` — there is no `registerLogo`. If `branding.logoUrl`
    turns out not to be the company mark either, this needs a backend field; the fix above is
    the best available with the data we have.
  - ⚠️ **Not verified against a live payload.** The public `/api/v1/guest/events` response is
    trimmed to `{branding, date, eventType, id, startTime, title}` (and `branding.logoUrl` came
    back `null` on the sample), and the participant endpoint needs a session I don't have. So
    whether real AGM rows actually carry `branding.logoUrl` is **unconfirmed** — if the cards
    now fall back to the building icon, that's the field being empty, and it's a backend fix.
  - **Left alone:** `events/page.tsx` (Launches artwork chain) and `hackathon/page.tsx` also use
    `organizerLogo` directly, but neither module has a registrar — the organiser there *is* the
    company, so the value is already correct.

- **2026-09-06 (14)** — Post-redesign audit (three parallel read-only reviews of gating, the
  Settings rebuild, and routing). Routing came back **clean** — every `?section=` link resolves,
  the KYC URLs all still work through `VerifyIdentityRoute`, and a repo-wide grep found zero
  references to the deleted profile sub-routes. Seven real defects found and fixed:
  1. ⚠️ **Verifying never ran the action it gated** (found independently by two reviews).
     `events/[id]/page.tsx` mounted the BVN sheet with **no `onVerified`**, and `requireKyc()`
     discarded the callback it was handed. A user could complete BVN + selfie, be told *"your
     AGM attendance is confirmed"*, and **no RSVP was ever sent** — same for Join Live and
     Pre-Vote. Fixed with a `pendingKycAction` ref that `requireKyc()` stores and the sheet's
     `onVerified` runs; dismissing clears it so it can't fire later against an unverified account.
     - This also required reordering `VerifyIdentitySheet.finish()` to call `onVerified` **before**
       `close()`. The old order fired `onClose` first, which (now) clears the pending action —
       my first cut of the fix was silently broken by that until the ordering changed.
  2. ⚠️ **Stale localStorage bypassed the `/agm` gate.** `agm/layout.tsx` accepted
     `kycStatus === "full"` from the user store, which seeds **synchronously from
     `localStorage["attend:demo:kyc"]`** and which `useLogout` never cleared. User A verifies and
     logs out → User B signs in on the same browser → waved into AGM content on first render,
     before B's own KYC was ever checked. Same hole kept access open after a KYC revocation. The
     comment there claimed "fail-closed"; it wasn't. Now gates purely on the layout's own query,
     returning `null` while it loads (which is what prevents the flash the store value was
     papering over). `useLogout` also now clears both `attend:demo:*` keys as defence in depth.
  3. **Notification toggles clobbered each other.** `toggle()` snapshotted the whole `Prefs`
     object, so a failed save reverted to a state captured *before* other rows were touched —
     flip two rows quickly and a failure on the first silently undid the second, even though the
     second had saved. Now reverts only its own key, builds the payload from the freshest state,
     and tracks in-flight rows in a `Set` instead of a single key.
  4. **Document Vault: duplicates + a dead click.** Independent per-tab `.includes()` put a
     `documentType` like `"meeting_notice_minutes"` under both Notices *and* Minutes. Replaced
     with `resolveCategory()` — first matching keyword wins, most specific first — so a document
     lands in exactly one tab. Download buttons on other rows also stayed enabled during a
     download but hit the re-entrancy guard and did nothing; all rows now disable while any
     download runs.
  5. **My Profile: unsaved avatar looked saved.** The Cloudinary upload succeeds independently of
     Save, so a failed save left the new photo on screen — disagreeing with the avatar in the
     left pane, which reads the shared cache. Now reverts on error. The form also re-seeded on
     every `me` change, so the post-save invalidation could overwrite a fresh edit mid-typing;
     it now seeds once per mount.
  6. **Verify sheet wiped typed input.** The stage effect depends on `step1Done`; a late-resolving
     KYC query jumped an already-typing user from the BVN stage to the face stage. Now skipped
     once the user has started typing.
  7. **Dead code removed** — `KYC_STEP_PATHS`, `resumePath()`, `completedStepCount()`,
     `KycStepPath` in `lib/kyc-progress.ts`, orphaned when the wizard became a sheet.
  - **Flagged, not changed:** an ended event that is `registered: true` but `hasRsvped: false`
    (on the register, never actually RSVP'd) is invisible in every My Events tab. Per the type's
    own docs `hasRsvped` is the authority on real attendance, so excluding it from "Attended" is
    right, and its absence from "All" follows the hide-ended-events rule. Say the word if such
    events should count as attended.
  - **Verification:** `tsc --noEmit` clean, dev server compiles. **None of this was exercised in
    a browser** — `/agm` and `/profile` both redirect to login without a session, so the RSVP
    resume, the gate's loading beat, and the toggle race all still need a real signed-in pass.

- **2026-09-07 (15)** — Login shell polish + Launches/General rebuilt to their frames.
  - **The phone mockup was invisible.** `OnboardingCarousel`'s image box had `flex-1` — in a
    column flex that sets `flex-basis:0%` on the vertical axis, which **overrides the explicit
    height**. With no definite height to grow into, the box collapsed to zero and a `fill` image
    inside it rendered nothing. (The pre-carousel markup had `flex-1` too, but its `<Image>` used
    explicit width/height so it had intrinsic size — switching to `fill` is what exposed it.)
  - **Then the phone's sides were cropped.** The box was `295×420` (0.70) while the artwork is
    0.74–0.80. `object-cover` crops whichever axis overflows, so a box *narrower in proportion*
    than the image trims the sides. Now sized by aspect ratio (`43/50` = 0.86) so it stays wider
    than any export and crops the **bottom** instead — the bleed the frame wants. Comment in the
    file warns to keep that ratio above 0.80 if the artwork is re-exported. `sizes` bumped
    295px → 342px to match.
  - Auth split is now **50/50** (was 45/55, cap 640px → 720px), and the form side is **plain
    white** — this reverses the earlier "form sits on a light gradient" instruction at the user's
    request; the grey read as dirty against the white page padding.
  - **Event detail (LAUNCH + GENERAL) rebuilt to the "About event" frame.** The hero now shows
    `flyerUrl || bannerUrl` — previously it was **always a flat brand-colour block** while the
    artwork rendered as a separate poster further down, so an event with a perfectly good flyer
    still showed a big empty rectangle. Brand colour stays as the backdrop, so no-artwork and
    broken-URL cases still read as branded. Also: no in-page Back (the shell's "About event" bar
    is the context), "Details" → "About this event", share button dropped, column capped at
    680px. Gated on `isSimpleLayout` — **AGM and Innovation are untouched**, keeping their agenda
    panel, action tiles, share button and uncropped poster.
  - **General list now matches the Launches frame.** `EventRow` moved out of `events/page.tsx`
    into shared `components/attend/EventListRow.tsx` (with `tileTint`/`fmtTime`), taking a
    `fallbackIcon` prop — Rocket for Launches, CalendarDays for General. `/general` gained the
    All / Past Events / Bookmarked tabs and the two-column row grid, replacing its `EventCard`
    grid. NavShell gives `/general` a title+sub like Launches has.
  - ⚠️ **The frame's "120 Registered" on list rows is not buildable.** `EventListItem` has no
    `registeredCount` — it exists on `EventDetail` only. Rows show date/time instead; noted in
    `EventListRow`. Needs the field added to the list endpoint.
  - **Flagged, not removed:** the Launch detail page still carries an **"Audience Access"** row
    (Press / VIP Guests / Public) that is **hardcoded labels with no backend data**, and a
    "Launching soon — N days to go" card. Neither is in the frames; both sit between the
    description and the CTA. Left in pending a call, since deleting features wasn't the ask.
  - `EventCard` now has one consumer left (`(guest)/guest/page.tsx`) — still live, not orphaned.

- **2026-09-07 (16)** — AGM detail: "More" menu + venue map, per the new frame.
  - **New `components/ui/Menu.tsx`.** There was no dropdown primitive in the app — the only menu
    (NavShell's account caret) is bespoke. Extracted its pattern (full-screen click-away catcher
    behind an absolute panel, trigger lifted above the catcher so a second click toggles rather
    than being swallowed) and added the two things it lacks: **Escape to close** and
    `role="menu"` / `aria-haspopup` / `aria-expanded`. Deliberately not a portal — `Dialog`
    portals at `z-[60]`, so a sheet opened from an item lands above and the menu closing beneath
    it is the wanted behaviour.
  - **Action row is now Proxy / Pre-AGM Voting / More.** The More menu holds **My receipts**,
    **Minutes** and **QR check-in**. Receipts and Minutes reuse the existing `ReceiptSheet` /
    `MinutesSheet` — same `{eventId, open, onClose}` contract as the proxy/pre-vote sheets, so
    they just mount alongside them; each already handles its own loading, empty and 403 states.
    QR stays a navigation (it's a full page). **Before this, receipts and minutes were not
    reachable from the event page at all** — only from the `/agm/*` hub via `AgmSubNav`.
  - ⚠️ **Fixed a real inversion:** the whole AGM block was gated `!isEnded`, so once a meeting
    ended it took Minutes and My receipts with it — the two things you specifically want *after*
    an AGM, and this page's only route to them. The section now renders for ended AGMs; Proxy and
    Pre-AGM Voting carry their own `!isEnded` guards instead, since neither is actionable then.
  - **New `components/attend/VenueMap.tsx`** — address line + embedded map, between the action
    row and Details, shown only when `event.venue` is set and the event isn't VIRTUAL. Uses the
    **keyless** `maps.google.com/maps?q=…&output=embed` URL (works today, no setup), and switches
    to the official `maps/embed/v1/place` endpoint automatically if `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
    is ever set. An "Open in Maps" link keeps the address actionable if the iframe is blocked.
    Safe here because cross-origin isolation is opt-in (`?coi=1` / `/zoom-meeting.html` only).
  - ⚠️ **Map accuracy is bounded by the data.** `EventDetail` has **no lat/lng and no structured
    address** — only free-text `venue`. A precise string geocodes well; a vague one ("Head
    Office") will not. Fixing that needs geo fields on the event.
  - **Not built — the frame's attendee avatar stack.** `EventDetail` exposes no attendee list and
    no avatar data at all (just the scalar `registeredCount`), so it can't be done without
    inventing people. Needs a backend field.
  - **Follow-up:** migrate NavShell's account menu onto the new `Menu` primitive (left alone here
    — it's a working user-visible control and swapping it is separate risk).
  - **Verification:** `tsc --noEmit` clean, dev server compiles. **Not exercised signed in** —
    `/agm` still redirects to login without a session, so the menu, the two sheets, the
    ended-AGM behaviour and the map all need a browser pass.

- **2026-09-07 (17)** — ⚠️ **Empty receipts were downloadable.** Found immediately on opening the
  new More → My receipts on a meeting with no votes. `ReceiptSheet` only guarded `!receipt`; when
  the API returned a receipt row that was *empty* (no votes, no proxy) it still rendered the full
  card — meeting name, "Time of vote —", "Cast via Attend app", and a **reference UUID** — above
  a working **Download receipt** button. That saves a PDF that looks like an official record of
  participation and certifies nothing. User: *"do not give an empty downloadable receipt."*
  - Now returns a shared `NoReceipt` state ("Receipt not available") whenever there are no votes
    **and** no appointed proxy. Rendered without the Dialog `footer`, so **there is no download
    button at all** in that state — the fix is structural, not just copy.
  - The reference shown was `data?.referenceId` — the response envelope's id, not a vote
    reference — so it was meaningless on an empty receipt as well as misleading.
  - **Checked `MinutesSheet` for the same class of bug.** Its `!minutes` branch was already
    correct (renders without a footer). Closed one remaining gap: a minutes row that exists with
    **blank content** would have rendered an empty document with a live Download button; that now
    falls into the same "not published yet" state.

- **2026-09-07 (18)** — **Q&A composer gated on the meeting being live.** The AGM side panel
  offered a question box and a Send button on an AGM scheduled weeks out — a question sent then
  reaches no Chair and no moderator. `AgmSidePanel` already receives `isLive`, so the Q&A tab now
  swaps the composer for a "Q&A opens when the meeting starts" state until then.
  - Replaced rather than disabled: a greyed-out textarea reads as broken, whereas this says *why*
    it isn't available yet. The tab itself stays visible so the panel doesn't shuffle between
    three tabs and two.
  - Note the endpoint (`POST /participant/events/{id}/questions`) does accept submissions at any
    time — this is a deliberate product gate, not an API limitation. Corrected the stale comment
    above the composer, which claimed submission worked outside the live room as a feature.

- **2026-09-07 (19)** — **QR check-in is a modal over the event page**, per its frame — it was a
  navigation to `/qr-checkin`.
  - New `components/attend/QrCheckinSheet.tsx`: centred `Dialog` with the frame's layout —
    "QR Check-in" + the "present this at the registration desk" line, the QR card, then the
    event title / date-time / venue block beneath it so staff and attendee can both see which
    meeting the code belongs to.
  - **Carried over every state from the old page** rather than reducing it to the happy path:
    the virtual-event guard, the loading skeleton, the no-ticket case ("RSVP first to get your
    code"), the checked-in confirmation with its scanned-at time, and the "waiting for the event
    team to scan" status strip. Attendance is still staff-scanned — nothing here self-checks-in.
  - Wired to **both** entry points on the event page: the AGM "More" menu item, and the non-AGM
    QR pill in the meta row (previously a `<Link>` away).
  - **Follow-up on the same day:** the first cut had `/qr-checkin` render the sheet itself, which
    left the modal floating over an empty page under a "Check-in" app bar. It now **forwards to
    `/events/{id}?qr=1`**, and the event page opens the modal from that param — so a bookmarked
    or shared check-in link always lands on the event, in context. Reading the param means
    `useSearchParams`, so `EventDetailPage` is now a thin `Suspense` wrapper around
    `EventDetailInner`.
  - **Modal no longer scrolls.** The QR area was `aspect-square w-full`, so it grew with the
    panel and pushed the dialog past the viewport. It's a fixed 200×200 box now (dialog capped
    at 360px), which keeps every state — QR, loading, checked-in, no-ticket — the same size.

- **2026-09-07 (20)** — **Launches/General detail is now one white card**, per the challenge-brief
  frame the user pointed at as the reference structure: banner *inset at the top of the card*
  rather than bleeding to the page edge, with title, meta, body and the CTA all inside it.
  - Implemented by carding the existing outer wrapper rather than restructuring the JSX — the
    CTA is already a sibling of the content column inside that wrapper (it's a grid sibling so
    it can sit under the content on desktop but below the side panel on mobile for AGM), so
    styling the wrapper captures banner, body and CTA in one card with no reordering.
  - Hero drops to `rounded-xl` on these two modules, since it's inset in a padded card now.
  - Still gated on `isSimpleLayout` — AGM and Innovation keep their existing full-width layout.
  - The frame's Overview/Prizes tabs are challenge-specific (`/hackathon/[id]`), not part of
    this; the user cited the frame for its card structure, not its tabs.

- **2026-09-09 (23)** — ⚠️ **The certificate on screen was never the real one.**
  `CertificateSheet` hand-drew the whole thing in JSX — a CSS gradient card, `ChevronCorner()`
  built from five rotated divs, a lucide `<Award/>` as the "seal", `border-t` rules for
  signature lines, hardcoded serif "Certificate / of attendance". Only the name, event title
  and verification number came from the API. That's why it looked nothing like what admin
  uploads.
  - The genuine artwork **was already reachable** — `cert.downloadPath`
    (`/api/v1/public/certificates/{id}/download`), which `hackathonClient`'s own comment
    describes as *"rendered onto the organiser's artwork where they uploaded one"*. It was only
    ever fetched when Download was pressed, so **the download had always been correct and only
    the preview was invented** — the two were different artefacts entirely.
  - Now fetched on open (when `issued && downloadReady !== false`) and rendered as the PDF
    itself in an `<object type="application/pdf">` with an `<iframe>` child for browsers with no
    inline viewer (iOS Safari). The object URL is revoked on close — an un-revoked one pins the
    whole PDF in memory.
  - **The same blob backs Download**, so what's on screen is byte-identical to what saves.
  - The hand-drawn card survives **only as a fallback** (fetch failed / no `downloadPath`),
    behind an amber "Showing a preview — download the PDF for your official certificate" note so
    it can't be mistaken for the official document. `certRef` still wraps it so the
    `downloadNodeAsPdf` snapshot path has something to capture.
  - **No `certificateUrl`/image field exists** anywhere in `src/api` or `src/types` (repo-wide
    grep) — the PDF blob is the only way to show the real artwork, which is why it's fetched
    rather than linked.
  - ⚠️ **Follow-up the same day — the fetch-as-blob approach above was itself wrong, and the
    fallback fired for a real user.** User supplied the actual `getCertificate` payload:
    `downloadPath`, `issued: true` and `downloadReady: true` were all present and correct, so
    the JSON was never the problem — the PDF fetch was failing. Root cause, found from the
    codebase's own evidence rather than guessed: `downloadPath` is a `/public/` route, meant to
    be hit as a plain browser navigation, but `apiClient.get(downloadPath, {responseType:
    "blob"})` is a **script-mediated read**, which is wrong in two ways at once —
    (a) `/api/v1/public/certificates/...` is **not** in `api-client.ts`'s `publicEndpoints`
    allowlist, so the interceptor attached a Bearer token to a route designed to need none;
    (b) reading a cross-origin redirect's body via script is subject to CORS, the exact failure
    already documented on `documentsClient`'s counted download (redirects to Cloudinary/OBS,
    which sends no CORS headers).
  - **Fixed by dropping the fetch entirely.** `certificateUrl` is now the raw `downloadPath`,
    referenced directly: `<object data={certificateUrl}>` for the preview (with an `<iframe>`
    child for browsers with no inline PDF viewer), and `window.open(certificateUrl, "_blank")`
    for Download — matching `DocumentVaultPanel`'s already-proven fallback pattern exactly. A
    plain resource load is a **browser navigation, not a script read**: it carries no
    Authorization header and isn't subject to CORS, so neither failure mode applies. The
    `next.config.ts` rewrite (`/api/v1/:path*` → backend) makes the relative path same-origin
    regardless of where the final file is actually stored.
  - Net effect: no more `useEffect`, no blob/object-URL lifecycle to manage, no
    `hackathonClient` import in this file at all — simpler than the version it replaced, not
    just more correct. The hand-drawn card remains, unchanged, as the fallback for the one case
    that's still a real gap: `downloadPath` missing entirely (logged via
    `console.warn("Certificate has no fetchable PDF yet:", …)` so that case stays distinguishable
    from everything else instead of collapsing into the same silent fallback again).
  - ⚠️ **Second follow-up, same day — the pure-navigation fix above broke the preview a
    different way.** User tested it: the `<object>` area rendered blank and the browser forced
    a save-file prompt instead. That's `Content-Disposition: attachment` on the response —
    confirmed behaviour, not a guess, since `window.open`/`<object>`/`<iframe>` all hit the same
    URL and all got the same forced download. **That header wins over every embedding technique
    for a direct navigation**; no client-side trick displays it inline while pointed straight at
    that URL. It also means the CORS theory in the entry above was likely never the real cause —
    the wrongly-attached Bearer token being rejected fits the original symptom just as well and
    is now the leading explanation, though this still hasn't been confirmed with an actual
    console error, only ruled out by elimination.
  - **Fixed by splitting preview from download**, since they now need different things from the
    same URL: **Download** still calls `window.open(certificateUrl, "_blank")` — confirmed
    working, and `Content-Disposition: attachment` is exactly what's wanted there. **Preview**
    fetches the same URL with a bare `fetch()` (deliberately not `apiClient` — no interceptor,
    no Bearer token) and renders the resulting blob: `URL.createObjectURL(blob)` into the
    `<object>`. A `blob:` URL carries no HTTP headers of its own, so the disposition header
    that forces a download for a direct navigation has no effect on it — the browser just
    renders whatever bytes it holds.
  - `previewFailed` is now only set from that `fetch()`'s own `.catch` (logged via
    `console.error("Certificate preview fetch failed:", …)`) — the earlier unreliable
    `<object onError>` handler is gone, since it never fired for the disposition-forced-download
    case in the first place.
  - ⚠️ **Third follow-up, same day — root cause now confirmed with an actual console error, not
    elimination.** User pasted the real browser output:
    > *"Access to fetch at 'https://attend-assets-prod.obs.af-south-1.myhuaweicloud.com/
    > certificates/...' (redirected from '.../certificates/{id}/download') from origin
    > 'http://localhost:3000' has been blocked by CORS policy: No
    > 'Access-Control-Allow-Origin' header is present on the requested resource."*
    So the CORS theory from the first entry above was right all along — it just took this log
    line to make it fact instead of a guess. `downloadPath` 302s to a Huawei OBS bucket that
    sends no CORS headers; a **browser** `fetch()` of it can never read the response no matter
    what headers the request carries, because CORS is enforced against what the bucket sends
    back, which this app has zero control over. Neither of the two previous fixes could ever
    have worked — they both still ended in a script-mediated read of that same bucket response.
  - **Fixed with a same-origin proxy** — new `src/app/api/certificate-pdf/route.ts`, mirroring
    the exact pattern (and reasoning) already in `src/app/api/proxy-image/route.ts` for the same
    Huawei bucket: a **server-to-server** fetch is exempt from CORS entirely (it's a
    browser-only policy), so this route fetches the PDF on the server and re-serves it from our
    own origin. The preview's `fetch()` now hits `/api/certificate-pdf?path=<downloadPath>`
    instead of the raw URL — same-origin, so the browser reads it fine — then blobs it exactly
    as before. Locked to the one known path shape
    (`/^\/api\/v1\/public\/certificates\/[a-zA-Z0-9-]+\/download$/`), not an open relay.
    Download is untouched (`window.open(certificateUrl, "_blank")` on the real endpoint,
    confirmed working by the user — CORS doesn't apply to navigation, only to script reads).
  - Lesson for next time this shape of bug shows up: **ask for the console error before the
    first fix, not after the second.** Two iterations were spent on theories (auth header,
    then disposition-only) that were each plausible from the code alone but wrong, when the
    actual `Access-Control-Allow-Origin` message would have pointed straight at the real
    fix immediately.
  - **Fourth follow-up, same day — the real certificate now shows, but with Chrome's own PDF
    viewer chrome on top of it** (its download/print/⋮ toolbar), which duplicates this panel's
    own Download button. That toolbar is the browser's, not this app's — suppressed the standard
    way: the blob URL now carries the PDF-viewer open-parameter fragment
    `#toolbar=0&navpanes=0&scrollbar=0` (honoured by Chrome/Edge's PDFium viewer and Firefox's
    pdf.js; the fragment is appended only on the copy handed to `<object>`/`<iframe>` — revoking
    the blob on cleanup still uses the bare, un-suffixed URL).

- **2026-09-09 (24)** — **Home cards fall back to the organiser logo.** `imageOf` was
  `flyerUrl || bannerUrl || null`, so an event with no flyer showed a pastel tint + a module
  icon. Replaced with `artworkOf()`: `flyerUrl || bannerUrl || branding?.logoUrl ||
  organizerLogo`.
  - `branding.logoUrl` **before** `organizerLogo` — on an AGM the latter is the *registrar's*
    mark (Meristem), not the company's. Same ordering as `AgmListCard`/`EventRowList`.
  - `artworkOf` returns a `kind` too, because fit differs: a flyer is a photo and fills the
    frame (`object-cover`), a logo is a mark and must be **contained + padded**, or a square
    logo gets cropped to the card's letterbox.
  - **Fixed a dead fallback while here:** the old `onError` set `display:none` on the broken
    `<img>`, leaving a bare tint — the module icon lives in the *other* branch and could never
    render. Failure is state now, so a dead URL properly falls through to the icon.
  - Both carousels now share one `CardArtwork` component instead of duplicating the block.
  - **Flag:** `src/components/attend/EventCard.tsx` is dead code — nothing imports it (the guest
    page defines its own). Left alone, but it's a stale copy that will mislead.
  - **Flag:** `BACKEND-FIX-certificate-eligibility.md` records the certificate endpoint 4xxing
    for Selected applicants, so many users still hit "No certificate found" regardless of (23).

- **2026-09-07 (21)** — Side-by-side against the frame; the user confirmed data differences don't
  matter, to **keep** the map (a deliberate deviation from the frame), and that **no virtual
  event should ever show one**.
  - **Banner was a slab on past events.** The hero used the taller `aspect-[649/301]` for
    `isLive || isEnded`. That aspect exists for the live *video preview* (it holds a play
    control); an ended event has no player, so it now keeps the frame's short, wide
    `aspect-[649/193]`. Only `isLive` gets the tall frame.
  - **Meta row trimmed on Launches/General** to date/time + participant count, per the frame.
    Format and venue chips stay on the other modules — on these two the venue is already the
    map's heading immediately below, so the chip was duplicating it.
  - **Duplicate "Open in Maps" removed.** The Google embed draws its own control over the map,
    so `VenueMap`'s header link rendered the same button twice. Header is address-only now.
  - **Virtual events can't get a map**, tightened two ways: `isVirtual` is now case-insensitive
    (`event.format` upper-cased — a lower-case "virtual" would have slipped through and put a
    map on an online-only event), and the single `VenueMap` call site stays gated on
    `!isVirtual && event.venue`. Confirmed by grep there is no other map or maps embed anywhere
    in `src/`.
  - ⚠️ **Kept against the frame: the QR check-in pill** on non-AGM in-person/hybrid events. The
    frame has none, but it is the *only* entry to a check-in code for those events (AGM reaches
    it via the More menu) — removing it would strand in-person attendees. One line to drop if
    that's wanted.

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


- **2026-09-10 (22)** — Backend status doc (2026-08-28) reviewed end to end against this app.
  Most of its 25 sections are organiser/admin/judge-side or pure backend; the participant-facing
  findings are below. **§25 gave us the real profile-update contract, and ours was wrong.**
  - `authClient.updateProfile` was a guess I'd marked `⚠️ ASSUMED` — wrong on four counts, all
    now corrected: **`PUT` → `PATCH`**, **`phoneNumber` → `phone`**, **`fullName` dropped**
    (no such field — it was being silently ignored), and **`username` added** (real, nullable,
    unique, 3-30 chars, lowercased server-side).
  - `MeResponse` gained `username`, and its `avatarUrl` now documents that it is **presigned and
    expires in an hour** — must be read from a fresh `/me`, never persisted.
  - **"Full Name" is now two inputs.** An earlier pass rendered one field and split on
    whitespace; §25 states the backend deliberately won't guess a split, and `MeResponse` already
    carries `firstName`/`lastName` separately — so the split was both lossy (multi-word surnames,
    middle names) and unnecessary.
  - **PATCH semantics honoured properly**: only changed fields are sent, so saving a phone here
    can't clobber a name edited elsewhere. `""` is sent *only* for `username`/`avatarUrl`, where
    §25 defines it as an explicit clear; `""` on a name or phone is a 400 by design, so those are
    omitted instead. A no-op save short-circuits with "nothing to save".
  - **`409` now reads distinctly** ("username or phone already belongs to another account")
    instead of collapsing into the single generic failure, and a phone change warns that the new
    number needs re-verifying (§25: changing it clears `phoneVerified`, which gates OTP delivery).
  - Settings header shows `@username` when set, falling back to email — the frame's `@handle`,
    now that something real backs it.
  - ⚠️ **Still may 404 until backend deploys §25.** That doc's own deployment note has §16-19
    committed-but-undeployed as of 2026-08-31 and doesn't list §20-25 as deployed. The soft
    failure path covers it; the difference is this now points at the route that will exist.

  **Confirmed already correct — no change needed:**
  - **§24** (join-time restrictions removed) explicitly warns FE apps not to gate Join on a
    countdown. Ours already gates on `event.status === "LIVE"`; the only `countdown` in the event
    page is the resolution voting window.
  - **§7g** (streamUrl can now be null) — the `missingStreamLink` → disabled "Join link not
    available yet" empty state already handles it.
  - **§18** (endpoint now 200 for every certificate state) — `CertificateSheet` already branches
    on `issued`/`eligible` and prefers `cert.message`, so this self-resolves. Worth testing the
    "never entered" and "still running" cases against §18's copy table.

  **Flags I raised that turned out to be non-issues on inspection:**
  - **§22** (submitted-document URLs are 1-hour presigned) — we only ever *write* those fields in
    `hackathon/apply/page.tsx`. There is no read-back UI, so the expiry can't bite us.
  - **§3** (`finalPosition` int → nullable Integer) — zero references anywhere in `src/`.
  - **§25 avatar expiry vs cache** — `useGetMe` inherits the 60s global `staleTime`, well inside
    the hour. Only exposure is a tab left untouched 60+ min (`refetchOnWindowFocus` is false).

  **Open, deliberately not taken in this pass:**
  - ⚠️ **Zoom signing does not use the backend at all.** `src/app/api/zoom/signature/route.ts` is
    our own Next route holding `ZOOM_SDK_SECRET` and signing the JWT itself — its own comment says
    *"Temporary — the real backend will own this endpoint."* §21 confirms the real routes now
    exist, including a **new guest one** (`POST /api/v1/guest/events/{id}/zoom/signature`, takes
    `X-Guest-Token`). `ZoomStage` currently makes one unconditional call to the local route with
    `role: 0` and has **no guest path at all** — the same file where `role: 0` was flagged while
    chasing "only admin can see video". Needs its own scoping: it moves where the SDK secret
    lives, adds a branch that has never existed, and §21 has no test coverage.
  - **§13** — winners now hold *two* certificates (winner + participation), but
    `GET .../certificate` returns one object, winner-first, so our sheet can only ever show one.
    Needs a backend list endpoint; not worth faking client-side.

- **2026-09-10 (23)** — ⚠️ **A newly created Innovation Challenge never appeared in the app.**
  Reported from admin: challenge created, `Published`, future-dated, absent from `/hackathon`.
  - **Root cause, measured not guessed: the backend's default page size is 20.** Confirmed by
    calling `/api/v1/guest/events` with no `size` — it returns exactly 20, and the response
    carries `{events, page, size, totalCount}`. The org has **69 events**.
  - `hackathon/page.tsx` pulls the **whole** events collection and filters to
    `HACKATHON`/`INNOVATION_CHALLENGE` **client-side**, and was the only list page in the app
    passing **no `size` at all** (AGM pages pass 50, home and search pass 100, general passes
    100/50). So it only ever saw the first 20 events of 69 and filtered *those* — any challenge
    outside that window was structurally invisible, regardless of its status or date.
  - **Two more instances of the same bug found while confirming it:**
    - `events/page.tsx` — `size: tab === "past" ? 50 : undefined`, so the **default Launches tab
      was capped at 20** too.
    - `search/page.tsx` — `useGetChallenges` had no `size` (its sibling `useGetEvents` had 100),
      so a challenge search could silently miss matches past the 20th.
  - All three now pass `size: 100`. **Note this is still a ceiling, not pagination** — at ~100
    events per organisation these pages will start dropping rows again. The real fix is either
    server-side filtering (pass `eventType`, as the AGM pages do) or real pagination; client-side
    filtering of a page-limited response is the underlying flaw.

- **2026-09-10 (24)** — Home card artwork: **flyer and logo now both just fill the card.**
  Took three passes to land; worth recording why the first two were wrong:
  1. `object-contain` on a pastel tint — most logos ship with their own white/grey backdrop, so
     it read as a mismatched rectangle sticker pasted onto an unrelated pastel.
  2. Blurred over-scaled backdrop + crisp centred logo — no seam, but it still left visible
     margin around the mark, which was the actual complaint.
  3. **`object-cover` for both kinds.** User: *"The logo should fill the cards, there shouldnt
     be any space round it."* Filling crops a logo's own built-in whitespace, which is exactly
     what should be cropped.
  - This let the `kind: "flyer" | "logo"` distinction go entirely — `artworkOf` is now a
     one-liner returning `string | null` and `CardArtwork` renders a single `<img>`. The
     `tileTint` background survives only as the backdrop to the module-icon fallback, which is
     what it was always for.

- **2026-09-10 (25)** — ⚠️ **Pre-existing hydration failure on the home page, found incidentally**
  while checking the above (it is *not* caused by (23)/(24) — confirmed against the diff).
  - The dev log showed the server rendering the amber KYC nudge (`<a href="/intro">`) where the
    client rendered `<section>`, so React discarded and re-rendered the whole page tree.
  - **Same root cause as the `/agm` gate bypass fixed on 2026-09-06**: `useUserStore().kycStatus`
    seeds itself synchronously from `localStorage` in a lazy `useState` initializer. The server
    has no localStorage so it reads `"none"` (nudge shown); the client's *first* render already
    reads `"full"` (nudge hidden). Guaranteed mismatch for any verified user.
  - Home now gates the nudge on `useGetKycStatus()`'s resolved response instead. Both renders
    agree (nothing until the answer lands), and it stops trusting a cached value that logout
    used to leave behind. `useUserStore` is no longer used on this page.
  - ⚠️ **Not verified in a browser** — `/` redirects to login without a session, so the render
    that produced the error can't be reproduced here. The cause is confirmed from the log; the
    fix needs a signed-in reload to confirm the error is actually gone.

- **2026-09-10 (26)** — **Detail-page banners now use a three-tier fallback** instead of an empty
  colour field. New shared `src/components/attend/EventBanner.tsx`:
  1. **flyer/banner** → fills the frame (unchanged behaviour).
  2. **no flyer → the company logo**, centred on its own background colour.
  3. **no logo → a stock poster**, picked by module.
  - Replaces two different weak fallbacks: `events/[id]` drew solid `brandPrimary` with the
    organiser's initials at 160px `white/10` clipped off the bottom-right corner (the empty blue
    slab on "TRADE EVENT"), and `hackathon/[id]` drew a `brandPrimary → brandAccent` gradient.
  - **Tier 2 gets "the logo's background colour" without reading a pixel.** An over-scaled,
    heavily blurred copy of the logo fills the frame with the crisp logo centred on top, so the
    surround *is* the logo's own colour by construction — flat white gives white, brand pink
    gives that pink, a gradient keeps the gradient. Sampling the colour would need
    `getImageData()`, which taints the canvas on a cross-origin image, and these logos come from
    the Huawei bucket proven (2026-09-09) to send no CORS headers — it would have to be proxied
    through `/api/proxy-image`, handle transparent PNGs having no background at all, and swap the
    colour in after load, flashing on every banner. For the common flat-background logo the two
    approaches are identical.
    - Note this is deliberately the *opposite* of the home cards, where the same blur treatment
      was rejected in (24) because the logo had to fill with no margin. Different ask: here a
      centred logo with a coloured surround is what the frame shows.
    - `tileTint()` remains the base layer underneath, visible only behind a transparent-PNG logo
      (blurring transparent pixels shows nothing).
  - **Tier 3 posters are mapped to modules, not hashed** — the two `HeroCard` assets are
    thematically paired: whiteboard/workshop → Innovation, red auditorium → AGM/Launch/General.
    Renamed to say which is which and to drop a space from a served path (the same footgun as the
    onboarding slides): `hero-card-workshop.png`, `hero-card-auditorium.png`.
  - Broken URLs now fall *through* to the next tier via state, rather than the old
    `style.display = "none"` on error, which left an empty frame because the fallback lived in
    the other branch and could never render.
  - ⚠️ **Both posters are ~800 KB PNGs, which is the wrong format for a photograph.** Re-exported
    as JPEG/WebP at the same 1180px they'd be ~100–150 KB. They're served to every event with no
    flyer and no logo. I can't re-encode images here — flagging for an asset pass. Cached after
    first load, so not a blocker.
  - `ChallengeDetail` carries no `organizerLogo`, so tier 2 on the challenge page reads
    `branding.logoUrl` only — which is the preferred source anyway (the company's mark, not a
    registrar's).

- **2026-09-10 (27)** — `tileTint` deduped: it was copy-pasted in **five** places
  (`agm/page`, `hackathon/page`, `hackathon/my-applications`, `(main)/page`, and an exported copy
  in `EventListRow`). Now a single definition in `src/lib/utils.ts` that all of them import —
  found the fifth only by grepping after the first four, and `EventListRow`'s was exported, so it
  was checked for external importers first (there were none; only the component itself is used).

- **2026-09-10 (28)** — Help centre contacts updated in `HelpPanel.tsx`:
  `support@experienceattend.com`, shown as `+234 700 ATTEND`, dialling `+234700288363` (the
  vanity letters keypad-mapped — A=2 T=8 T=8 E=3 N=6 D=3 → 288363, or `tel:` has nothing to
  dial). Verified these are the only hardcoded support contacts in the app; the landing page
  carries social links only.
  - ⚠️ `+234 700 288363` is 9 digits after the country code where a standard Nigerian mobile is
    10. Normal for an 0700 vanity line, but a phone number can't be tested from here — worth
    confirming it connects.

- **2026-09-10 (29)** — ⚠️ **The blurred-fill idea in (26) was wrong; replaced with real pixel
  sampling.** A logo that was an Earth photo on **black** produced a washed-out purple-grey
  banner rather than a black one. The reason is simple and I should have seen it before shipping
  it: blurring averages the *whole image*, so it yields the average colour of the artwork, which
  is not the colour of its background. The two only coincide when a logo is mostly background
  already — which is why it looked fine in reasoning and failed on the first real logo.
  - New `src/hooks/useImageEdgeColor.ts` reads the background colour from the logo's **edge
    pixels** — four corners plus each edge midpoint on a 32x32 downscale, quantised into
    16-level buckets so compression noise doesn't split one colour into eight, then averaging
    the winning bucket's true values. Edges work because a logo's border is almost always
    backdrop rather than mark.
  - The CORS objection I used to rule this out is real but already solved in this repo: sampling
    goes through `/api/proxy-image` (the same route `dom-to-pdf` uses, for the same reason), so
    the canvas is never tainted. The visible logo still loads direct, so what's on screen never
    depends on the proxy being up.
  - Returns null while sampling and on every failure path — proxy refuses the host, image won't
    load, or the logo is a cut-out PNG whose edges are transparent and so has no background
    colour at all. `tileTint` covers all of those.
  - Logo sized up from `max-h-[46%]`/`max-w-[38%]` to `64%`/`54%` — the other half of the report
    ("so it doesn't look lost").
  - **Verified end to end against real data this time, not reasoned about:** pulled a live logo
    URL off the guest events endpoint (a presigned Huawei URL carrying an explicit `:443`, which
    `URL.hostname` strips, so the proxy allowlist still matches), confirmed `/api/proxy-image`
    returns it 200 as `image/jpeg`, then replicated the sampling algorithm over the downloaded
    bytes — all eight edge points came back identical at `rgb(229,229,229)`. Unanimous, and the
    correct backdrop for that logo.

- **2026-09-10 (30)** — **Back navigation restored on Launch/General event detail.** My own
  regression: the control exists in `events/[id]/page.tsx` but I gated it behind
  `!isSimpleLayout` while matching the Launches frame, which shows no in-page back control.
  `isSimpleLayout` is LAUNCH + GENERAL, so both lost it — and the app-bar title is *context*, not
  navigation, so those pages had no way back at all. Gate removed; it renders on every module.
  - All back controls on these pages now use **`useGoBack`** rather than raw `router.back()`.
    That matters for the stated requirement ("lead back to the page the user is coming from"):
    `history.back()` returns wherever they actually came from — Home, a search result, the module
    list — but does **nothing at all** on a directly-opened link, which is precisely the shared-
    or-pasted-URL case. The hook falls back to a route instead.
  - The event page's fallback is **module-aware**, since the four modules are reached from four
    different lists: `AGM → /agm`, `HACKATHON → /hackathon`, `LAUNCH → /events`,
    `GENERAL → /general`.
  - Also converted the load-failure state's "Go back" on the same page — that state is exactly
    where a stale or pasted link lands, i.e. the no-history case where a bare `back()` leaves the
    user stranded on the error.
  - Converted the two other raw `router.back()` pages for consistency:
    `hackathon/resources` and `hackathon/submit` (both call sites there, header + form Cancel),
    each falling back to the challenge itself. `useRouter` dropped from `resources` where it
    became unused; kept in `submit`, which still uses `router.push`/`router.replace`.
  - **No raw `router.back()` remains anywhere in `(main)`.**

  **Audited and deliberately left alone:**
  - **Nav roots** (`page.tsx`, `agm`, `hackathon`, `events`, `general`, `profile`) — the six
    sidebar destinations; there's nowhere in-app to go "back" to.
  - **Immersive live rooms** (`agm/live`, `events/live`) — NavShell already treats these as
    chrome-less, and the AGM room has its own *Leave meeting* control.
  - **Transient/dead** — `qr-checkin` now forwards to `/events/{id}?qr=1`; `events/qr-checkin` is
    unreachable (nothing links to it).

  ⚠️ **Still missing back nav, flagged not fixed** (each currently relies on a tab/pill row that
  doubles as navigation): `agm/minutes`, `agm/receipt`, `agm/proxy-history` (AgmSubNav pills),
  `hackathon/my-applications` (tab row), and — the strongest cases, since they have no tab row at
  all — `notifications` and `search`, both reached from app-bar icons. Say the word.

- **2026-09-10 (31)** — ⏳ **OPEN: banner tier swap.** Requested — HeroCard posters to tier 2,
  logo treatment down to tier 3 — but not implemented, because it has a consequence needing a
  decision first: the posters are **local files that always load**, so with them at tier 2 the
  logo tier can never be reached, making the logo rendering *and* `useImageEdgeColor` dead code.
  Options are (a) delete the logo treatment and the sampling hook, (b) keep it as a never-firing
  safety net for a missing poster asset, or (c) make it conditional rather than a chain (e.g.
  prefer the logo when the organiser has one). Chain is still flyer → logo → poster until then.

- **2026-09-10 (32)** — **List thumbnails now carry the organiser logo, via one shared component.**
  Reported on the Launches/General list: rows should show the organiser's logo too. Cause was
  drift — five lists had grown five *different* artwork chains, and two of them never looked at
  `branding.logoUrl` at all:

  | List | chain before |
  |---|---|
  | Home cards (`artworkOf`) | flyer → banner → branding.logoUrl → organizerLogo ✅ |
  | `EventListRow` (Launches + General) | flyer → banner → organizerLogo — **no branding.logoUrl** |
  | `hackathon/page.tsx` tile | **organizerLogo only** — no flyer, no banner, no branding |
  | `AgmListCard` | branding.logoUrl → organizerLogo — no flyer/banner |
  | `profile/EventRowList` | branding.logoUrl → organizerLogo — no flyer/banner |

  New `src/components/attend/EventThumb.tsx` owns both the resolver (`eventArtwork`, exported and
  now used by the home cards too, so the ordering has exactly one definition) and the tile.
  Canonical order stays **flyerUrl → bannerUrl → branding.logoUrl → organizerLogo**;
  `branding.logoUrl` beats `organizerLogo` because on an AGM the latter is the *registrar's* mark
  (Meristem), not the company holding the meeting.

  Two real bugs fixed along the way, not just consolidation:
  - **Blank/whitespace URLs.** The API sends `""` for "no logo", which is truthy-adjacent enough
    that `organizerLogo` alone passed the `? :` test and rendered a permanently broken `<img>`.
    `eventArtwork` drops blanks.
  - **A broken URL blanked the tile instead of falling through.** The old rows set
    `display:none` on error, which left an empty coloured square — the icon fallback lived in the
    other branch of the ternary and so could never render (same mistake `EventBanner`'s comment
    already warns about). `EventThumb` tracks failures **by URL value** rather than as an index,
    so it walks to the next tier and a refetch that fills in a flyer can't leave the cursor
    pointing at the wrong one — and no reset effect is needed.

  `tint` is a prop because `EventRowList` tints by brand/module colour (its fallback is white
  initials) while every other list uses the pastel `tileTint`. `object-cover` fill is retained
  per (28) — containing a logo reads as a sticker on a mismatched pastel. Sizes moved to the
  canonical `h-15 w-15` while touching them. `tsc` clean.

- **2026-09-10 (33)** — **KYC: wall → prompt at the point of use.** `agm/layout.tsx` used to
  replace the whole `/agm` subtree with an "Identity verification required" interstitial whenever
  `kycStatus !== "FULL_KYC"`. Because it was a *layout*, it blocked the list, minutes, receipts,
  proxy history, pre-vote, proxy and the live room — an unverified shareholder could not see that
  an AGM existed. Now: browsing is free, acting is gated, and the modal is raised on opening an AGM.

  **Two findings reshaped the work.** (a) The old page wizard was **already gone** — every
  `src/app/(kyc)/*` route except `success` was a 7–9 line shim rendering the *same* new sheet, and
  `/bvn`, `/chn`, `/liveness` had zero inbound links. So this was "remove one wall + 6 dead URLs",
  not "delete a second flow". (b) `(kyc)/success/page.tsx` was **load-bearing**: the only screen
  that rendered *under review* and *declined + rejectionReason*. The modal's terminal stage knew
  only "You're Confirmed!".

  ⚠️ **(b) was an infinite loop waiting to happen**, and the reason most of this diff exists. Every
  gate keys on `=== "FULL_KYC"`, so `PENDING_REVIEW` reads as unverified. Prompt-on-open +
  bounce-on-dismiss would have given: open AGM → modal → re-run a form they'd already completed →
  "Confirmed!" → still not FULL_KYC → bounce → repeat, with no way out.

  **Two invariants now carry the design**, stated as comments where they're enforced:
  - **Only auto-open when submitting can change the status.** New `src/lib/kyc-gate.ts` splits the
    entitlement (`isKycFull`, still what every *action* checks) from `isKycActionable`
    (NO_KYC / PENDING / BASIC_KYC). `PENDING_REVIEW` and `REJECTED` are never auto-prompted — they
    get a notice, since no amount of re-running BVN + selfie makes an officer approve you.
  - **Completing verification is never a dismissal.** `finish()` calls `onVerified` then closes, so
    hooking the bounce to `onClose` would have ejected **every user who successfully verified** from
    the page they verified for — and Escape on the done stage too. Added a distinct `onDismiss`;
    only that bounces.

  **Changes:**
  - `agm/layout.tsx` rewritten: renders children, overlays the sheet on action routes only.
    **Allowlist of free routes**, not a blocklist (a blocklist fails open for routes added later),
    compared by **exact equality** — `startsWith("/agm/proxy")` also matches `/agm/proxy-history`.
    `/agm/proxy-history` is free: its list is necessarily empty for the unverified, and someone
    who *was* verified and is now under review must still be able to revoke a live proxy.
    `/agm/pre-vote` and `/agm/proxy` suppress children while gated — they *are* Dialogs, so
    stacking gave two backdrops and two Escape handlers firing two competing navigations.
  - `events/[id]`: auto-open broadened from LIVE-only to any AGM, `+ isKycActionable + !qrOpen`
    (`?qr=1` would otherwise open QrCheckinSheet and the verify sheet together). `openedByGate` ref
    means only an unrequested prompt bounces — opening it yourself from the banner and closing
    leaves you put. `router.replace`, never `push`: with `push`, Back re-enters and re-prompts
    forever. `runPendingKycAction` now re-reads status from the query cache before replaying.
  - New `KycStatusNotice` (content ported from `/success`) + a `review` stage on the sheet; the
    terminal stage is status-aware, so it **stops telling PENDING_REVIEW users they're confirmed**.
    Needed `useKycStep3` to *return* its invalidation promise (as `useKycStep1` already did) —
    firing and forgetting meant `setStage("done")` read the pre-submit snapshot.
  - Amber card on the detail page kept (still reachable on review/declined/query-error) and made
    status-aware; it no longer replaces the whole tile grid, which had been hiding the "More" menu
    and with it My receipts / Minutes / QR check-in — read-only things whose own routes are free.
  - Home nudge removed per PM, **parked working** in `KycNudgeBanner` and mounted on Profile so it
    can't rot. Opens the sheet in place — parking it with its `<Link href="/intro">` intact would
    have been a landmine that only fired on re-enable. Revert = uncomment 2 lines on Home.
  - Profile dropped `useUserStore().kycStatus` (localStorage-seeded, `useLogout` never cleared it →
    user A verifies, logs out, user B logs in on the same browser and is told they're verified).
  - Deleted `src/app/(kyc)/**`, `VerifyIdentityRoute.tsx`, `(auth)/face-capture` (a redirect stub
    with zero references). Added `redirects()` to `next.config.ts` so the retired URLs land on
    `/agm` — verified 307 → `/agm` against the dev server.

  `tsc` clean. ⚠️ **Not verified in a browser** — every `(main)` route redirects to login without a
  session, so the whole behavioural checklist in the plan is still outstanding. Also asked backend
  (§3 of `BACKEND_ASKS_2026-09-10.md`) to confirm vote/proxy/join reject non-`FULL_KYC`
  server-side: this gate is a client overlay, and if the API accepts those calls the `/agm/live`
  overlay should go back to being a hard block.

- **2026-09-10 (34)** — **Home page reconciled against the Figma dashboard frame.** A layout-by-layout
  audit against the frame found 20 differences; this is the agreed subset. Two were rejected as
  fixes on purpose:
  - **`+ Create Event`** — the frame has it, we don't, and we're not adding it. The frame's URL is
    `/Dashboard` on the admin host; creating events is an organiser action, not a participant one.
  - **The 5-item sidebar** — the frame folds General away; we keep 6, since dropping the item
    would hide a working `/general` module.

  **Changed — `NavShell.tsx`:**
  - **Active nav pill is green** (`#e6f4ec` / `#0A3D2E`), was `bg-primary/10 text-primary`.
    ⚠️ `--primary` is `hsl(222 39% 11%)` — a near-black **navy** — so the active item was rendering
    grey-blue while the design's accent is the brand green (same green as the logo and the Browse
    banner). Hardcoded **here only**, by decision: `--primary` also drives every button, focus
    ring, badge, the quorum bar and the avatar chips, and none of those are green in the design.
  - **User card shows the real photo**, with initials as the fallback and an `onError` flip back to
    initials (a dead URL otherwise renders a torn image, since the initials sit in the other
    branch). Required adding `avatarUrl` to the `Session` user type in `useSession.ts` — the hook
    already fetches `/auth/me` and just wasn't passing the field through. Applied to the mobile
    avatar chip too.
  - Trailing icon `ChevronDown` → `ChevronsUpDown`.
  - **Top bar on `/` now says "Home"**, was "Events". The old comment claimed the frame said
    "Events" — that was an earlier revision, and it's corrected in place so it doesn't get flipped
    back. Search placeholder → `Search for events`.
  - **Content column 1152px → 960px** (`max-w-240`), in both the header's inner container and
    `<main>`'s column — they must stay equal or the bar's title stops lining up with the page
    heading. The frame measures ~768px; 960 is the agreed middle ground, since 768 strands most of
    a widescreen.
  - **Warm gradient** added: a diagonal wash on the header (neutral at the title, warming toward
    the search/bell) plus a downward fade on `<main>`. On `<main>`, deliberately **not** on the
    960px column inside it — there it would paint a visible banded rectangle with hard edges on a
    wide monitor. All stops opaque, since the header is sticky.

  **Changed — `(main)/page.tsx`:**
  - **Card artwork was too tall — the biggest single difference.** The frame is ≈**2.6:1**; ours was
    ≈1.8:1, which is what made the cards read chunky. `LiveCard` `h-[168px]`→`h-[116px]`,
    `UpcomingCard` `h-[150px]`→`h-[108px]`, and `CarouselSkeleton` shrunk to match so the page
    doesn't jump as the query resolves. ⚠️ `CardArtwork` uses `object-cover`, so a shorter box
    crops wide organiser logos harder — worth an eye once there's real data.
  - **New `CardCarousel.tsx`** replaces both bare `overflow-x-auto` rows. Windows Chrome paints an
    always-visible scrollbar under those, which appears nowhere in the design. Uses the
    **existing** `.no-scrollbar` utility (`globals.css:45`) plus dot pagination. Dots are per
    **page** (`scrollWidth / clientWidth`), not per card — that's what gives three dots for a long
    list, matching the frame. Clickable, labelled, and hidden when there's only one page. Two
    details that matter: the ResizeObserver is keyed on the child **count**, not on `children`
    (a fresh array each render would rebuild the observer continuously), and the page count is
    rounded, since a sub-pixel `scrollWidth`/`clientWidth` difference otherwise reports a phantom
    empty page.
  - Discover chips: **Innovation `#f9b6ff` (bright pink) → `#fde9b0` (amber)** per the frame, and
    each icon now takes a darker shade of its own chip instead of all three being navy-grey.
  - Upcoming date drops the year — swapped `formatDate` for the **already-existing**
    `formatShortDate` (`utils.ts:80`), which returns exactly the frame's "8 Aug".
  - Browse All Events banner → **half the column** on desktop (`md:w-1/2`), full width on mobile
    where half a phone can't hold the copy and button side by side. `ChevronRight` →
    `ArrowRightCircle`.

  **Left alone, with reasons:**
  - **"2,000 watching"** on live cards — no viewer count on the list endpoint. `LiveRoom` derives
    one (`LiveRoom.tsx:114`) but from the **quorum** endpoint: per event, gated on live *and*
    registered. On Home that's one gated call per card, empty for anyone unregistered.
  - **"120 Registered"** on upcoming cards — deferred. The backend's list schema declares
    `rsvpCount` and our types don't have it, so we may not be reading a field we already get; but
    that schema is known stale, so it needs one real response first. Logged in `BACKEND_ASKS`.
  - **Discover tile copy** — the frame repeats one placeholder line three times; ours is real
    per-module copy.
  - **Inactive nav pills** — the frame *looks* like all items sit on light-grey pills over a white
    sidebar (the inverse of ours). Low confidence, since those pills are near-white in the export,
    and it would restyle all six items on a guess. Flagged, not built.
  - **Logos instead of photos** in card artwork is missing flyer data, not layout.

  `tsc` clean. ⚠️ **Not verified in a browser** — Home redirects to `/login` without a session. The
  scrollbar removal in particular must be checked on **Windows** Chrome, where scrollbars are
  always on; macOS auto-hides them and would mask the whole problem.

- **2026-09-10 (35)** — **Five follow-ups on the Home page**, after review of (34):

  1. **Content left-aligned** — dropped `mx-auto` from both the header's inner container and
     `<main>`'s column (they must change together or the bar's title stops lining up with the page
     heading). Centring a 960px column in the space beside the sidebar pushed everything toward
     the middle of the screen and left a gap against the sidebar; the frame starts content right
     after it.
  2. **Carousels slide on their own** — `CardCarousel` gained `autoPlayMs` (default 5s, `0`
     disables). Advances a page at a time and wraps. Held back in four cases: one page,
     `prefers-reduced-motion`, pointer/focus over the row, and permanently once the user takes
     over (scroll, touch, or a dot) — resuming would drag the row off the card they'd just
     chosen. The interval reads the live page from `scrollLeft` rather than closing over `page`,
     so it isn't torn down and rebuilt on every advance. Two traps worth remembering: the
     takeover signal must be pointer/wheel/touch and **not** `onScroll`, which autoplay's own
     smooth scroll fires and would use to switch itself off after one slide; and the wheel check
     compares `deltaX` to `deltaY`, because wheel events bubble from whatever is under the cursor
     — without that, scrolling the page past a carousel killed its sliding for the session.
  3. **CTA card gradient** — two concentric arcs of lighter green sweeping in from the right, as
     one `radial-gradient` with hard stops. Deliberately not a smooth fade: the banded edge *is*
     the effect, and a soft one reads as a smudge. White at low alpha rather than fixed greens, so
     it tracks the base colour if the brand green is ever retuned.
  4. **RSVP count now shows when present** (reverses the deferral in (34), on request). Added
     `rsvpCount?: number | null` to `EventListItem` — the detail response calls it
     `registeredCount`, the list response `rsvpCount`. `UpcomingCard` renders the second meta item
     only on `!= null`, **not** on truthiness: a real 0 is worth showing, and an absent field must
     render nothing rather than "0 Registered". Label is "Applied" for Innovation, "Registered"
     otherwise, per the frame. The API client passes list JSON straight through with no
     whitelisting, so this is self-verifying — if the backend sends the field it appears, and if
     it doesn't the card looks exactly as it did. Still worth confirming on a real response;
     the backend ask stays open.
  5. **Profile icon replaces the initials** in the sidebar user card and the mobile chip (was
     "EC"). Photo first, person icon as the fallback. `initialsFor` is no longer imported here.

  `tsc` clean. Still unverified in a browser — Home redirects to `/login` without a session.
  Autoplay and the hidden scrollbar both need a real look on Windows Chrome.

- **2026-09-10 (36)** — **HeroCard poster as the Home card fallback, 2s Live-now slide, gradient
  geometry fixed.**

  1. **No logo → HeroCard poster.** A Home card for an event with no flyer *and* no organiser logo
     used to render a tinted box with a small module glyph in it — a grey square with a building
     icon sitting beside neighbours carrying real photography. It now falls through to the stock
     poster for its module. The chain is flyer → banner → `branding.logoUrl` → `organizerLogo` →
     **poster** → icon (the icon is now effectively unreachable, kept only so a missing/renamed
     asset degrades to a glyph rather than a torn image).
     - The poster map moved out of `EventBanner.tsx` into **`src/lib/posters.ts`** so both surfaces
       resolve the same "nothing uploaded" case identically. `posterForEventType()` is there for
       callers holding a raw `eventType` rather than a resolved module.
     - **Deliberately NOT applied to `EventThumb`** (the 60x60 list rows and the hackathon tiles).
       A 1180x436 poster cropped to a 60px square is an unreadable smear of one corner; the module
       icon is the better answer at that size.
  2. **Live now slides every 2s** (`autoPlayMs={2000}`). Upcoming keeps the 5s default — those
     cards carry more to read. Both still pause on hover/focus and stop for good once the user
     scrolls or picks a dot.
  3. **CTA gradient geometry corrected.** The first attempt used `115% 190%`, and a vertical radius
     that large makes an almost-vertical edge — the arc that's meant to bulge left barely curved,
     and two stacked stops added a second band the design doesn't have. Now a single crisp arc:
     `radial-gradient(ellipse 46% 58% at 90% 50%, …)`. The `58%` is the load-bearing number — only
     just over the 50% half-height, which is what bends the boundary hard while still letting the
     wedge reach the top and bottom edges (so it has no visible cap inside the card). The arc
     crosses mid-height at 44% of the width and sweeps out to ~67% at the edges. Hard stop, not a
     fade: the crisp boundary is the effect.

  ⚠️ **Performance note now that the posters are on Home.** Both are **~800KB PNGs at 1180x436**
  (`hero-card-auditorium.png` 868K, `hero-card-workshop.png` 765K) — the wrong format for
  photographs, flagged before but previously only loaded on a detail page. They now load on the
  dashboard for any event lacking artwork. It's one download per poster, not per card (same URL,
  so the browser caches it), but ~800KB for a 300x116 thumbnail is still heavy on mobile data.
  Re-encoding to WebP at ~1200px wide should cut them by roughly 10x. Not done here — converting
  binary assets is its own change.

  `tsc` clean; both posters verified serving 200 from the dev server. Still unverified in a
  browser (Home redirects to `/login` without a session).

- **2026-09-10 (37)** — **Home touch-ups + a real carousel bug.**

  🐛 **`CardCarousel` reported 1 page for rows that actually scrolled**, which hid the dots *and*
  disabled autoplay — the Live now row looked like it had no carousel at all. Cause was mine:
  `pageCountOf` used `Math.round(scrollWidth / clientWidth)`. Four 300px cards in a ~900px row is
  **1.41** screenfuls, and `round(1.41)` is **1**. Now `Math.ceil`, keeping a 2px slack (which is
  what `round` was there for — a sub-pixel scrollWidth/clientWidth difference is normal at some
  zoom levels, and bare `ceil` would invent an empty second page for a row that fits exactly).

  Two related fixes fell out of it. The active dot and the scroll target now both work off the
  **real scrollable range** (`scrollWidth - clientWidth`) rather than in viewport-width steps:
  with 1.41 screenfuls there is only 0.41 of a viewport left to scroll, so `scrollLeft /
  clientWidth` could never reach 1 and the last dot never lit up, nor could clicking it reach the
  end. Extracted as `pageCountOf` / `pageFromScroll` / `scrollLeftForPage` so the three callers
  (measure, onScroll, the autoplay interval) can't drift apart again.

  Also:
  - **Cards larger**, ratio held at ~2.6:1 — Live `w-[300px]/h-[116px]` → `w-[340px]/h-[130px]`,
    Upcoming `w-[280px]/h-[108px]` → `w-[320px]/h-[122px]`, skeleton to `w-[320px]/h-[186px]`
    (artwork 122 + the 64px text block) so the page doesn't jump on load.
  - **Upcoming also slides at 2s**, matching Live now.
  - **Search + bell moved to the window's right edge.** The header's inner container was capped at
    the content column's 960px, so `justify-between` parked them at that column's right edge with
    empty space beyond. The cap is gone; the title keeps `md:px-8` so it still lines up with the
    page heading below, but the bar now spans the full width.

  **Reviewed a proposed `CTABanner` snippet** (linear `#06231A`→`#1F5C3F` base + a 500px soft
  radial glow). Not adopted — it produces two smooth effects where the design has one crisp arc,
  and its fixed-size glow lands near the card's horizontal middle and fades out before the right
  edge. Assessment given in chat. Worth taking from it if revisited: `rounded-2xl` (the reference
  corners look nearer 16px than our 12px) and `whitespace-nowrap` on the Explore button.

  `tsc` clean. Still unverified in a browser.

- **2026-09-10 (38)** — **KYC nudge removed from Settings/Profile too**, on request — the amber
  "Complete identity verification to unlock voting" row. Verification is demanded at the point of
  opening an AGM now, so no screen nudges for it.

  `KycNudgeBanner` is kept and still works; the mount is commented out with a restore breadcrumb,
  matching Home. Profile also no longer reads any KYC state at all (the `useUserStore().kycStatus`
  read went with the nudge in (34) — noted in the file so the localStorage-seeded value isn't
  reintroduced if the nudge returns).

  ⚠️ **`KycNudgeBanner` now has no live consumer anywhere.** Mounting it on Profile was
  specifically what kept it from rotting — the whole point of (34) §5 — so that safety net is
  gone: nothing will catch it breaking, and a future revert should verify it renders rather than
  assume. Warning left at both commented-out mounts, and Home's comment (which claimed Profile
  still mounted it) corrected.

  `tsc` clean.

- **2026-09-11 (39)** — **Small follow-ups, both offered earlier.**
  - **Revoke-proxy error message corrected** in `PreVoteSheet.tsx` and `agm/proxy-history`. The
    fallback read *"Proxy revocation endpoint (DELETE …) is currently unavailable on the server"*
    — true when written (2026-07-22), false since the backend built it (confirmed in the API spec
    2026-09-10). It fired on any generic failure, so it blamed a missing endpoint for problems
    that weren't that and would send whoever read it debugging the wrong thing. Now a plain
    "We couldn't revoke your proxy just now. Please try again." The server's own message still
    wins whenever it says something specific.
  - **CTA banner**: `rounded-xl` → `rounded-2xl` (the reference corners read nearer 16px), and
    `whitespace-nowrap` on the Explore pill so it can't wrap on a narrow card. The two parts
    worth keeping from the proposed `CTABanner` snippet reviewed in (37).
  - **Stale header comment on `(main)/page.tsx` fixed** — it still said the attendee counts
    weren't shown, which stopped being true when `rsvpCount` was wired in (35).

- **2026-09-11 (40)** — **Settings page brought closer to the Figma frames.** From a comparison
  against the "My profile" and "My Events" frames. Decisions taken: pin the panel to the right
  edge, keep two name fields, shrink logos onto white tiles, fix the event count, person icon for
  "EC", match the list styling. **Not** done: grey pills behind inactive sidebar items (declined).

  **Pinned right-hand panel** (`profile/page.tsx`). At `lg`+ the open section is a full-height
  panel fixed to the window's right edge — divider line, its own cool-grey gradient background,
  its own scroll — sitting under the sticky 64px top bar (`top-16`, the bar's higher z-index
  hides the seam). Being `fixed`, it escapes the 960px content column without touching the shell.
  - Its width lives in one CSS variable, `--settings-panel-w: clamp(400px, 34vw, 600px)`, and
    the list's width is **derived** from it (`calc(100vw - 360px - var(...))`, capped at 520px).
    That derivation is what guarantees the list never slides under the panel; don't hardcode one
    without the other. 360px = sidebar 259 + left padding 32 + gap 48 + ~21 scrollbar slack.
  - ⚠️ **Behaviour change at tablet widths**: the two-pane view now starts at `lg` (1024px), was
    `md` (768px). Between 768 and 1023 Settings shows one pane at a time with the back arrow —
    there isn't room beside the sidebar for a list *and* a 400px panel.
  - With nothing selected, the pinned panel shows "Choose a setting to view it here."

  **Left list**: name block no longer in a card; avatar 56px with the **person icon** as fallback
  (was initials) plus an `onError` fallback; smaller "Edit Profile". Rows are borderless white
  with **bare icons** in Figma's set (`Files`, `FolderOpen`, `Vault`, `Bell`, `Lock`,
  `MessageSquareMore` — all verified present in lucide-react 0.400.0). With the border gone, the
  open row is marked with a ring. Sign-out row restyled to match.

  🐛 **"My Events" count fixed.** The row said "X events **attended**" but counted the entire list,
  upcoming RSVPs included — "6 events attended" for someone who'd attended none, disagreeing with
  the Attended tab one click away. Now uses the tab's own rule, `filterEventsByTab(…, "Attended")`.

  **My profile**: person icon instead of initials, `onError` fallback (tracked by failed URL, so
  picking a new photo clears it with no reset effect). Two name fields kept — re-confirmed; one
  "Full Name" box would mean guessing where a multi-part name splits.

  **Upload diagnostics**: the avatar upload's `catch` swallowed the error, so a failed upload
  (seen 2026-09-11) had nothing to diagnose it by. It now `console.error`s the HTTP status,
  response body, file type and size. **Cause still unknown** — waiting on the Network tab details.
  Separately confirmed: the API spec wants `folder` as a **query** param and we send it in the
  multipart body. Probably harmless (Spring binds both), not yet changed.

  **Logo tiles** (`EventThumb` gains `fit="contain"`): used by `EventRowList`, so it applies to
  **both** My Events and Saved Events. White tile, thin border, logo `object-contain` with padding,
  and **logos preferred over flyers** (`logoFirstArtwork`) — a flyer photo shrunk into 44px reads
  as nothing. Tint + initials remain the no-image fallback. Home and the module lists keep `cover`.

  Still open from the comparison, not requested: evenly-spread tabs (D1), darker company name after
  "By:" (D3), smaller row chevron (D4), Last Name field has no icon (C3), mobile-phone vs handset
  icon (C4), Save button shadow (C7).

  `tsc` clean. Not verified in a browser (`/profile` redirects to login without a session).

- **2026-09-11 (41)** — **Phone number locked; top-bar warm gradient removed.**
  - **Phone is now read-only in My profile**, shown like email: grey row, padlock, no input. It is
    no longer sent in the save payload, so the form can only change first/last name and the photo.
    One shared helper line now reads "Your email and phone number can't be changed here." The
    phone-specific success message and the 409 "number belongs to another account" branch went
    with it, since this form can no longer send a phone.
    ⚠️ This is a product decision, not a backend limit — `PATCH /auth/me` does accept a phone
    change (§25). Consequence: an account with **no phone on file can't add one** from here.
  - **Warm peach wash removed** from the top bar and from the fade at the top of `<main>`, on
    request ("remove the brown gradient"). It lived in `NavShell`, so it's gone from **every**
    page, not just Settings — flat `#f1f1f1` bar again. Likely it was never wanted: in (34) I read
    "don't forget the gradient" as this top wash, when it probably meant the Browse All Events
    banner's gradient. The banner's green arcs and the Settings panel's cool-grey background are
    untouched.

  `tsc` clean; no warm-wash colours left anywhere in `src/`.

- **2026-09-11 (42)** — **Live room (`LiveRoom.tsx`) restyled to the Figma live-room frame.**
  Kept as a **separate page** and the **video box left exactly as it was** (Zoom draws its own
  contents; Minimise and the collapsed bar are unchanged) — per the user, this pass is layout and
  styling only. Applies to both `/agm/live` and `/events/live`, since both render `LiveRoom`.
  - **Same panel layout as the AGM event page** — superseded by (43): the `minmax(0,1fr)` + 400px
    grid used here came out almost 50/50 inside NavShell's 960px column.
  - **Left column order now follows the frame:** video → title → "You're Confirmed" →
    LIVE · date/time · N Registered → segmented amber quorum bar with the shareholder total on
    the right (AGM, participants only) → "Details". Title moved from above the grid into the
    column, at the event page's `text-2xl font-medium`.
  - **Removed, per the frame:** the organiser label above the title (the blue "QA"), the brand
    logo tile, the "Not live" pill, the "N watching" count, and the three Quorum / Resolution /
    Status boxes under the video. The watching count's field-probing helper went with it.
  - **Top row is just "← Leave meeting"**, restyled like the event page's Back. The frame has no
    back control, but this page is where people *leave the meeting from* — the sidebar isn't a
    substitute for guests/proxies who arrived by link. The LIVE pill moved into the meta line
    rather than onto the video, because the video box is Zoom's and was to be left alone.
  - **Right panel:** tabs are text-only with a dark underline (was icon + `text-xs`), in the
    frame's order **Agenda · Q&A · Resolution** ("Ballot" renamed), opening on **Agenda**. The
    Agenda tab now always shows — it used to disappear when an event had no agenda;
    `AgendaPanel` already has an empty state. Non-AGM rooms: Agenda · Q&A · Press Kit · Polls.
    The outer white card is gone, so the content that sat on it (resolution cards, the open
    resolution's voting block) now carries its own white card.
  - ⚠️ **Behaviour change: an AGM room no longer opens on the ballot.** To stop a voter missing a
    vote because they're on Agenda, the amber/red "Voting open · Resolution N · Xs remaining" strip
    under the video (kept — it only appears while a vote is open, which the frame doesn't depict)
    is now a button that jumps to the Resolution tab.
  - **Deliberately not built (user's call):** the frame's Appoint a Proxy / Pre-AGM Voting / QR
    check-in tiles, and its "Confirm Attendance" button — someone on this page is already in the
    meeting, and pre-voting closes once it's live.
  - **Small mismatches left, flag only:** the frame's "You're Confirmed" is green; the event page
    renders it in `text-primary` (navy), and this room follows the frame (`text-emerald-700`).
    The frame's "Today, 12:00 PM" is relative; both pages print the full date.

  `tsc` clean in `src/` — the only errors are in the generated `.next/types/validator.ts`, which is
  stale (it still lists deleted routes like `(kyc)/bvn`) and unrelated to this change. **Not
  verified in a browser** — `/agm/live` needs a signed-in session.

- **2026-09-11 (43)** — **Live room + AGM event page: 60/40 split, panel pinned to the right edge.**
  User, comparing with the frame: *"the area with the video box is wider than the area with the
  agendas…"*. (42) had both pages on `minmax(0,1fr)` + a fixed 400px panel inside NavShell's 960px
  column, which gave the video side ~464px against the panel's 400 — almost 50/50, with dead space
  right of the column on wide screens. The frame (measured at 1440) is sidebar 259 | video side
  ~712 | panel ~469: the panel is ~40% of the area right of the sidebar, pinned to the window edge,
  full height, on its own background behind a divider.
  - **Settings' pinned-panel technique, reused**, with the numbers in one place: new
    `src/lib/pinned-panel.ts`. Panel `clamp(360px, (100vw − 259px) × 0.4, 560px)`, fixed right,
    `top-16` under the top bar, own scroll, same grey gradient as the Settings panel. The content
    column's width is **derived** from it (`100vw − 340px − panel`; 340 = sidebar 259 + padding 32
    + gap 32 + ~17 scrollbar), so it can't slide under the panel. NavShell's 960 cap is untouched
    for every other page — on wide screens these columns extend past it, still inside the viewport.
  - Resulting video side | panel: 1280 → ~532 | 408 · 1440 → ~628 | 472 · 1920 → ~1020 | 560.
  - ⚠️ **Two-pane now starts at `xl` (1280), was `lg` (1024).** At 1024 the video side would be
    ~324px (the old grid gave it ~269). Between 1024 and 1279 the panel now stacks under the
    content, as on mobile.
  - Event page: AGM only (Launches/General untouched). The CTA takes the content column's width so
    it lines up with the video; `lg:col-start-1` went with the grid.
  - The video box is unchanged — ZoomStage is `w-full`, so it just gets wider.

  `tsc` clean in `src/` (only the stale `.next/types` errors). **Not verified in a browser** — both
  routes need a signed-in session; check 1280 / 1440 / 1920 on Windows Chrome.

- **2026-09-11 (44)** — **Innovation challenge page (`hackathon/[id]`): 60/40 layout, Back, real flyer.**
  - ⚠️ **The flyer never showed — always the whiteboard poster.** The banner was fed
    `challenge.bannerUrl`, and `bannerUrl` doesn't exist on the backend (their 2026-09-11 note; the
    live `/v3/api-docs` has it on no schema). The challenge response
    (`ParticipantChallengeDetailResponse`) has **no image field at all** — `flyerUrl` is only on
    `ParticipantEventDetailResponse`. So the page now **always** fetches the event detail (same id;
    it was already the fallback when the challenge call fails) and feeds its `flyerUrl` to
    `EventBanner`. Logo and poster remain the fallbacks. The loading gate is unchanged — it still
    only waits on the event call when the challenge call failed.
    ⚠️ The backend note calls `flyerUrl` "Product-Launch-only (null elsewhere)". If a challenge that
    has a flyer still shows the poster, the backend isn't returning it on the event detail for
    challenges — a backend fix, not ours.
  - **Back button added** at the top. `useGoBack("/hackathon")` was already wired, but only the
    load-error state rendered a button.
  - **Resources panel uses the AGM pages' pinned 60/40 layout** (`lib/pinned-panel.ts`): from 1280px
    it's fixed to the window's right edge, full height, own scroll. Still opened and closed by the
    "Challenge Resources" row and its ×. The brief is held at the 60% width whether or not the panel
    is open, so opening it never reflows the page (it was a 672px column that switched to a grid
    with a 360px panel on open). Below 1280 the panel stacks under the content.

  `tsc` clean in `src/` (only the stale `.next/types` errors). **Not verified in a browser** — needs a
  signed-in session, and a challenge whose event detail actually carries a `flyerUrl`.
