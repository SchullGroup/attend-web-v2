# Backend asks — participant web app

**2026-09-10.** Verified against `https://attend-api.schulltech.com/v3/api-docs`.

Two asks. One confirmation. Everything else we thought we needed already exists — see the bottom.

---

## 1. NIN verification — no endpoint exists

**Priority: high.** This is the only functional gap.

Innovation and Launch attendees verify with **NIN** at the RSVP point (AGM shareholders use BVN
and are fully working). There is no NIN endpoint in the API, so the frontend currently collects
the NIN, plays the verification screens, and **resolves locally — nothing is sent and nothing is
stored.** The verification is cosmetic. We cannot gate anything on it.

### 1a. `POST /api/v1/participant/kyc/nin`

Mirror `kyc/step1`.

```json
{ "nin": "12345678901", "dob": "1990-01-31", "consent": true }
```

- NIN is 11 digits, same as BVN.
- Verify against NIMC and record it on the participant.
- Reject a mismatch against the account's name/DOB the same way step1 does.

### 1b. `POST /api/v1/participant/kyc/nin-selfie`

Mirror `kyc/bvn-selfie/v2` exactly, including **HTTP 200 on a failed match** with the result in
the body:

```json
{ "nin": "12345678901", "selfieImage": "<base64 JPEG, no data: prefix>" }
```

```json
{ "valid": true, "confidenceValue": 92.4, "message": "..." }
```

### 1c. Expose NIN state on `GET /api/v1/participant/kyc`

**This is the part that actually blocks us.** Without it there is no way to distinguish a verified
NIN user from an unverified one, so no screen can be gated on it. Add whichever fits your model:

```json
{ "ninVerified": true, "nin": "12345678901" }
```

`nin` echoed back matters for the same reason `bvn` is: it lets us re-run the selfie check without
ever persisting an identity number on the device.

---

## 2. `Access-Control-Allow-Origin` on the OBS bucket

**Priority: medium.** Infrastructure, not code.

Bucket: `attend-assets-prod.obs.af-south-1.myhuaweicloud.com`

It sends no `Access-Control-Allow-Origin`, so the browser blocks any JS read of those objects.
Confirmed in the browser console 2026-09-09:

```
Access to fetch at 'https://attend-assets-prod.obs...' (redirected from
'.../api/v1/public/certificates/{id}/download') from origin '...' has been blocked
by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

Breaks two things:

1. **Certificate preview** — `/api/v1/public/certificates/{id}/download` 302s to the bucket, so
   the browser can't read the PDF to display it.
2. **Logo background sampling** — reading logo pixels on a `<canvas>` taints it and throws.

We work around both with server-side proxy routes (`/api/certificate-pdf`, `/api/proxy-image`),
since server-to-server requests aren't subject to CORS. **Both get deleted the day the header
lands** — we'd rather not maintain proxies.

Please allow our web origins on GET/HEAD, `Access-Control-Allow-Origin` and `ETag` exposed.

To be clear: **serving the files works fine.** Flyers and logos render normally in `<img>`. The
old "OBS returns 403 to anonymous GET" problem is resolved. This is only the CORS header.

---

## 3. Confirm: are AGM actions rejected server-side for non-verified users?

**Priority: confirm before we ship the new KYC gate.**

We just moved KYC from a full-page wall on `/agm` to a modal raised at the point of use. The AGM
list is now browsable unverified, and `/agm/live`, `/agm/pre-vote` and `/agm/proxy` render with the
verification modal over them.

That gate is **client-side**. It's an overlay on a mounted page, and the shared dialog closes on
Escape. We bounce the user out when they dismiss, so there's no reachable state with the page and
no modal — but that is a UI guarantee, not a security one.

So please confirm these reject a participant whose `kycStatus !== "FULL_KYC"`:

- cast vote / pre-vote submission
- appoint or change proxy
- join the AGM live session (the Zoom signature endpoint in §1's sibling, and the resolutions feed)

If any of them accept an unverified participant, tell us and we'll put a hard block back on
`/agm/live` instead of an overlay.

## 4. Confirm: notification on application status change

Does a notification fire when an admin changes an application's status
(`SUBMITTED → UNDER_REVIEW / ACCEPTED / REJECTED`)?

Application-**submitted** notifications are confirmed working. We just need a yes or no — the
frontend is already built either way.

---

## Previously asked for — confirmed already built, no action needed

Listing these so nobody re-does them:

| Ask | Status |
|---|---|
| `DELETE /api/v1/participant/events/{id}/proxy` (revoke proxy) | **Exists.** Our stale error message was wrong; we're fixing it. |
| `POST /api/v1/zoom/signature` | **Exists.** We're switching off our temporary local route. |
| `POST /api/v1/guest/events/{eventId}/zoom/signature` | **Exists.** |
| Registered count on list items | **Exists** as `rsvpCount`. Our gap — we weren't reading it. |

---

## One note on the docs

The Swagger **list** schema is stale and cost us real time. `EventItem` declares only
`id, title, eventType, status, date, rsvpCount, documents`, but live responses also return
`flyerUrl`, `organizerLogo`, `branding`, `format`, `venue` and `organizerName` — we can see them
rendering. Worth regenerating.

Also: the detail response has `flyerUrl` and no `bannerUrl`. Please confirm `bannerUrl` is not a
field anywhere so we can delete it from our types.
