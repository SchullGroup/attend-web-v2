# Attend Web — Update Spec (2026-07)
**Repo:** `Attend/web` · Next.js 16 App Router · TypeScript · Tailwind v4 · TanStack Query · STOMP over SockJS  
**Scope:** Participant web app changes for the July 2026 feedback batch.  
**Read this first:** `../../docs/ATTEND_UPDATE_SPEC_2026-07_MASTER.md` for context, decisions, and API contracts.

---

## 0. How to use this doc

Every item is self-contained. Follow the file list, wire the API, implement the UI, tick the acceptance criteria. Items independent behind flags per master §9.

Cross-references: `[M§3]` design tokens · `[M§5.X]` API contracts · `[M§8]` error copy.

---

## 1. Prerequisites

```bash
cd Attend/web
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type check
```

No new npm deps required (jsPDF already present for PDF; use native browser Push API + Service Worker for K).

Feature flags: `src/lib/features.ts` (new) → `useFeature(name)` fed from `GET /api/v1/tenants/{id}/features`.

Design system: dark slate primary `hsl(222 39% 11%)`, Outfit font, shadcn-style Tailwind. Do not introduce new UI primitives.

---

## 2. Files map (all changes)

```
src/app/
├── (auth)/
│   ├── register/page.tsx             # C — email/phone optional
│   ├── bvn-recover/page.tsx          # NEW — L
│   └── login/page.tsx                # add "Sign in with BVN" link
├── (guest)/
│   ├── layout.tsx                    # NEW — B
│   └── join/[code]/page.tsx          # NEW — B
├── (main)/
│   ├── events/[id]/page.tsx          # A (late RSVP gating)
│   ├── agm/
│   │   ├── live/page.tsx             # F, G, N (via LiveRoom)
│   │   ├── pre-vote/page.tsx         # G, D
│   │   ├── proxy/page.tsx            # D (remove virtual block + direction picker)
│   │   ├── proxy-history/page.tsx    # E (enrich)
│   │   └── receipt/page.tsx          # G, N
│   ├── hackathon/
│   │   ├── page.tsx                  # I, J (list card banner + colors)
│   │   └── [id]/page.tsx             # I, J (hero + brand scope)
│   └── profile/
│       └── notification-preferences/page.tsx  # K (opt in/out)
├── api/
│   ├── auth/bvn-recover/route.ts     # NEW — L (BFF proxy)
│   └── push/subscribe/route.ts       # NEW — K (BFF proxy for Web Push)

src/components/
├── attend/
│   ├── LiveRoom.tsx                  # F, N (three-column tally, per-res breakdown)
│   ├── NomineeBallot.tsx             # NEW — G
│   ├── ResolutionCard.tsx            # NEW — extract from LiveRoom
│   └── SourceBreakdown.tsx           # NEW — N
├── EmptyState.tsx                    # NEW — consistency
└── Skeleton.tsx                      # NEW — consistency

src/api/
├── auth/bvnRecover.ts                # NEW — L
├── guests/client.ts + hooks.ts       # NEW — B
├── agm/proxy.ts                      # extend — D, E
├── agm/nominees.ts                   # NEW — G
└── push/client.ts                    # NEW — K

src/lib/
├── features.ts                       # NEW
├── push-notifications.ts             # NEW — K
└── rsvp.ts                           # NEW — A

public/
├── sw.js                             # NEW — K service worker
└── vapid-public-key.txt              # ref (public key for Web Push)
```

---

## 3. AGM module

### 3.1 Late RSVP window `[Item A]`

**Helper — `src/lib/rsvp.ts`:**
```ts
export function rsvpWindow(event: { startTime: string; lateRsvpMinutes?: number }) {
  const start = new Date(event.startTime).getTime();
  const cutoff = start + (event.lateRsvpMinutes ?? 30) * 60_000;
  const now = Date.now();
  return {
    isOpen: now <= cutoff,
    closesAt: new Date(cutoff),
    minutesLeft: Math.max(0, Math.round((cutoff - now) / 60_000)),
  };
}
```

**UI change — `src/app/(main)/events/[id]/page.tsx`:**
- Use `useEffect` + `setInterval(30_000)` to recompute window state.
- If `event.status === 'LIVE'` and open: `<Badge className="bg-amber-50 text-amber-700 border-amber-200">Late registration open — {n}m left</Badge>`.
- If closed: disable RSVP button; show `<p className="text-sm text-muted-foreground">Registration closed at {timestamp}. Contact your registrar to attend.</p>`.

**Contract:** `[M§5.2]`.

### 3.2 Guest access `[Item B]`

**New route group `src/app/(guest)/`:**

`layout.tsx` — minimal layout, no main nav; header shows brand + guest badge if session active.

`join/[code]/page.tsx`:
1. Client component reads `params.code` and query `eventId`.
2. Calls `GET /api/v1/guest/invites/{code}` (public, unauthenticated) for preview (event name, capabilities).
3. Renders capture form: Full name, Email OR Phone, Role dropdown.
4. Submit → `POST /api/v1/guest/redeem` → server sets HTTP-only guest cookie, returns guest session.
5. `router.replace('/agm/live?eventId=' + eventId)` or event detail.

**Capability enforcement — `LiveRoom.tsx`:**
Read `useSession()` (extend existing hook). Hide vote UI when `!capabilities.includes('VOTE')`; render read-only card "Voting is reserved for shareholders." Hide Q&A input when `!capabilities.includes('QA')`.

**Header badge on `(main)/layout.tsx`:** if session.type === 'GUEST', top band `Guest • {role}`.

**Contract:** `[M§5.3]`.

### 3.3 Email OR phone `[Item C]`

**File:** `src/app/(auth)/register/page.tsx`

Update yup schema — currently both required:
```ts
const schema = yup.object().shape({
  fullName: yup.string().required(),
  email: yup.string().email(),
  phone: yup.string().test("phone", "Phone must be 11 digits", v => !v || v.length === 11),
  password: yup.string().min(8).matches(/[0-9]/, "Include a number").required(),
}).test("email-or-phone", "Provide at least one of email or phone", v => !!v.email || !!v.phone);
```

Also update `src/types/auth/requests.ts` — relax `RegisterRequest` interface.

Below phone field:
```tsx
<p className="text-sm text-muted-foreground">
  You need at least one of email or phone.{" "}
  <Link href="/bvn-recover" className="underline">Sign in with BVN recovery</Link>.
</p>
```

**Contract:** `[M§5.4]`.

### 3.4 Virtual proxy + pre-directed votes `[Item D]`

**File:** `src/app/(main)/agm/proxy/page.tsx` (line 56–82 has the virtual block)

1. **Remove the amber warning block** for VIRTUAL — proxy now works for all formats.
2. **Add direction picker** per resolution below the appoint-proxy form:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Direct your votes (optional)</CardTitle>
    <CardDescription>
      Choose your position on each resolution. Selections auto-cast when voting opens.
      Choose "Let proxy decide" to leave it to your proxy.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    {resolutions.map(res => (
      <div key={res.id} className="border rounded-lg p-4">
        <h4 className="font-medium">{res.title}</h4>
        <RadioGroup value={directions[res.id] ?? "LET_PROXY_DECIDE"} onChange={v => setDirection(res.id, v)}>
          <Radio value="FOR" label="For" color="text-green-700" />
          <Radio value="AGAINST" label="Against" color="text-red-700" />
          <Radio value="ABSTAIN" label="Abstain" color="text-amber-700" />
          <Radio value="LET_PROXY_DECIDE" label="Let proxy decide" color="text-muted-foreground" />
        </RadioGroup>
      </div>
    ))}
  </CardContent>
</Card>
<Button onClick={handleSubmit}>Save proxy directions</Button>
```

Confirmation dialog on submit: "You are pre-directing votes on X of Y resolutions. This cannot be changed after voting opens."

**Contract:** `[M§5.5]`.

### 3.5 Proxy history enriched `[Item E]`

**File:** `src/app/(main)/agm/proxy-history/page.tsx`

For each row, expandable section with per-resolution direction + cast outcome (auto-cast timestamp or "Awaiting proxy").

**Contract:** `[M§5.6]`.

### 3.6 Per-resolution results `[Item F]`

**File:** `src/components/attend/LiveRoom.tsx`

Extract resolution rendering into `ResolutionCard.tsx`:
- Always expanded (no collapse-by-default).
- Head-count + share-weighted bars side by side (already partially present).
- Status pill + countdown when `OPEN`.
- If `nominees.length > 0` → render `<NomineeBallot />`, else `<StandardBallot />`.
- Below: `<SourceBreakdown />` (§3.9).

Aggregate meeting summary card (if wanted) at the bottom of the resolutions list — never on top.

### 3.7 Multi-nominee ballot `[Item G]`

**New component `src/components/attend/NomineeBallot.tsx`:**
```tsx
export function NomineeBallot({ resolution, tally, canVote }: Props) {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const cast = useCastVote();
  return (
    <div className="space-y-3">
      {resolution.nominees.map((n, i) => (
        <div key={n.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{i + 1}. {n.name}</p>
            {n.bio && <p className="text-sm text-muted-foreground">{n.bio}</p>}
          </div>
          <div className="flex gap-2">
            <ChoiceButton value="FOR" current={choices[n.id]} onClick={() => setChoice(n.id, "FOR")} disabled={!canVote} />
            <ChoiceButton value="AGAINST" current={choices[n.id]} onClick={() => setChoice(n.id, "AGAINST")} disabled={!canVote} />
            <ChoiceButton value="ABSTAIN" current={choices[n.id]} onClick={() => setChoice(n.id, "ABSTAIN")} disabled={!canVote} />
          </div>
        </div>
      ))}
      {canVote && (
        <Button onClick={() => confirmAndCast(choices)} className="w-full">
          Cast {Object.keys(choices).length} votes across {resolution.nominees.length} nominees
        </Button>
      )}
    </div>
  );
}
```

Cast payload: `{ nomineeVotes: [{ nomineeId, choice }, ...] }` per `[M§5.7]`.

Confirmation dialog before submit: shows summary; warns about undirected nominees (recorded as Abstain).

Receipt (`/agm/receipt/page.tsx`) — for each resolution with nominees, render nested list of nominee votes; jsPDF template updated to include them.

### 3.8 Combined tally `[Item N]`

**New component `src/components/attend/SourceBreakdown.tsx`:**
```tsx
export function SourceBreakdown({ tally, weighted = false }: Props) {
  const rows = [
    { key: "ONLINE", label: "Online" },
    { key: "IN_ROOM", label: "In-Room" },
    { key: "PROXY", label: "Proxy" },
  ];
  const suffix = weighted ? "Shares" : "Count";
  return (
    <table className="w-full text-sm border-t mt-3 pt-3">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pb-1">Source</th>
          <th className="pb-1 text-right">For</th>
          <th className="pb-1 text-right">Against</th>
          <th className="pb-1 text-right">Abstain</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.key}>
            <td>{r.label}</td>
            <td className="text-right">{tally.bySource[r.key][`for${suffix}`] ?? 0}</td>
            <td className="text-right">{tally.bySource[r.key][`against${suffix}`] ?? 0}</td>
            <td className="text-right">{tally.bySource[r.key][`abstain${suffix}`] ?? 0}</td>
          </tr>
        ))}
        <tr className="font-medium border-t">
          <td>Total</td>
          <td className="text-right">{tally.total[`for${suffix}`]}</td>
          <td className="text-right">{tally.total[`against${suffix}`]}</td>
          <td className="text-right">{tally.total[`abstain${suffix}`]}</td>
        </tr>
      </tbody>
    </table>
  );
}
```

Include in `ResolutionCard` and in receipt page.

**Contract:** `[M§5.12]`.

### 3.9 BVN recovery `[Item L]`

**New page `src/app/(auth)/bvn-recover/page.tsx`** — three-step wizard (mirror mobile flow §3.10):

1. Enter BVN → `POST /api/v1/auth/bvn-recover/init`
2. Enter OTP → `POST /api/v1/auth/bvn-recover/verify`
3. Add contact (optional) → `POST /api/v1/auth/bvn-recover/complete`

BFF proxy route `src/app/api/auth/bvn-recover/route.ts` if server-side cookie handling required.

**Contract:** `[M§5.10]`.

### 3.10 Mobile polish — n/a for web (consistency pass only)

### 3.11 Receipt PDF `[Item O]`

Already implemented via jsPDF (see `src/app/(main)/agm/receipt/page.tsx:88-120`). Extend template with:
- Nominee-level vote rows when applicable (§3.7)
- Source breakdown table per resolution (§3.8)

---

## 4. Innovation Challenge module

### 4.1 Banner `[Item I]`

**File:** `src/app/(main)/hackathon/[id]/page.tsx`

Read `challenge.bannerUrl`; when set, hero uses it:
```tsx
<div
  className="relative aspect-video rounded-xl overflow-hidden"
  style={{ backgroundImage: `url(${challenge.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
>
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <div className="absolute bottom-0 p-6 text-white">
    <h1 className="text-3xl font-bold">{challenge.title}</h1>
  </div>
</div>
```

Fallback: existing `from-purple-700 via-purple-800 to-fuchsia-900` gradient.

**List cards on `hackathon/page.tsx`:** small banner thumbnail (240×135) at top.

### 4.2 Color palette `[Item J]`

Wrap challenge detail root in scope with CSS vars:
```tsx
<div
  className="challenge-scope"
  style={{
    "--brand-primary": challenge.brandPrimary || "#9333ea",
    "--brand-accent":  challenge.brandAccent  || "#c084fc",
  } as CSSProperties}
>
  ...
</div>
```

Then in Tailwind classes use arbitrary values:
```tsx
<Button className="bg-[var(--brand-primary)] hover:opacity-90 text-white">Apply</Button>
```

Rest of app untouched (vars scoped to `.challenge-scope` only).

---

## 5. Broadcast & Notifications module

### 5.1 Push notifications `[Item K]`

**Service worker `public/sw.js`:**
```js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Attend", {
      body: data.body || "",
      icon: "/icons/notification.png",
      badge: "/icons/badge.png",
      data: data.data || {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.deepLink || "/";
  event.waitUntil(clients.openWindow(url));
});
```

**Client `src/lib/push-notifications.ts`:**
```ts
export async function ensurePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: sub.toJSON().keys,
    }),
  });
  return sub;
}
```

**BFF `src/app/api/push/subscribe/route.ts`:** forwards to `POST /api/v1/devices` (backend) with the user's auth cookie.

**Prompt on `notification-preferences/page.tsx`:** button "Enable push notifications" → calls `ensurePushSubscription()`; shows state (Enabled/Disabled/Blocked).

**Contract:** `[M§5.9]`.

Note: Web Push on iOS Safari requires iOS 16.4+ and PWA install. Feature-detect and gracefully degrade.

### 5.2 SMS pricing — n/a for web

---

## 6. Bug fixes already shipped `[Item P]`

No known web-specific bugs from the 6 tracker items (those were admin + mobile). Confirm no regression while implementing above.

---

## 7. Shared contracts

See master §5. Endpoints touched by web client (via BFF or directly):
- `POST /api/v1/participant/events/{id}/register`
- `POST /api/v1/guest/redeem`
- `POST /api/v1/auth/bvn-recover/{init,verify,complete}` (via `/api/auth/bvn-recover` BFF)
- `POST /api/v1/devices` (via `/api/push/subscribe` BFF)
- `POST /api/v1/agm/{eventId}/proxy/directions`
- `POST /api/v1/agm/{eventId}/resolutions/{resId}/vote` with `nomineeVotes[]`

---

## 8. Error state matrix

Copy verbatim from `[M§8]`. Surface via `sonner.toast.error()` for transient, inline `<p className="text-destructive text-sm">` for form fields, full-page card for unrecoverable (guest code invalid, BVN no register).

---

## 9. QA checklist (web slice)

- [ ] Register with email only → succeeds
- [ ] Register with phone only → succeeds
- [ ] Register with neither → validation blocks + BVN link shown
- [ ] Complete BVN recovery flow end-to-end
- [ ] Late RSVP badge + disable at cutoff
- [ ] Guest join flow with view-only vs vote-enabled capabilities
- [ ] Virtual AGM proxy form loads (no block), direction picker works
- [ ] Multi-nominee resolution renders per-nominee grid; receipt reflects
- [ ] Live tally shows Online/In-Room/Proxy columns
- [ ] Challenge branding: banner + colors applied per challenge only
- [ ] Web Push: subscribe on Chrome → receive test notification → click → correct page opens

Type check:
```bash
npx tsc --noEmit
```

Cross-browser: Chromium, Firefox, Safari 16.4+ (Web Push gracefully degrades on older Safari).

---

## 10. Rollout order + feature flags

Read from `useFeature(name)`; per-item UI gate:
```tsx
const flags = useFeatures();
{flags.feat_late_rsvp && <LateRsvpBadge />}
```

Ship order: C+L → A → D+E → F+G+N → B → I+J → K.

---

**End of web spec.**
