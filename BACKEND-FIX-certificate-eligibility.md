# Backend fix: certificate eligibility ignores Selected applicants

**Problem:** Participants can't see/download certificates. The certificate endpoint
only treats someone as eligible if they have an **attendance/check-in** record, so a
**Selected** applicant who didn't attend is rejected as "not eligible" and gets no
certificate. Per product: **selection alone should qualify** (attendance is optional for
selected applicants), and unselected attendees still get participation certificates.

**Endpoint:** `GET /api/v1/participant/challenges/{challengeId}/certificate`

**Verified** (real response for a Selected/Lead applicant, challenge
`e0dad233-6457-430c-9643-da1f7457d097`):
```json
{
  "code": "NOT_ELIGIBLE",
  "error": "Not eligible",
  "message": "You did not participate in this challenge.",
  "status": false
}
```
Returned with a **4xx** status (not 200). The applicant is Lead + Selected in
`/api/v1/innovation/applications/me`, yet the certificate route says "did not participate".

**Fix:**
1. **Eligibility** — a participant is eligible if **either**
   - they attended/checked in *(existing → participation certificate)*, **or**
   - their application status is **Selected** *(→ certificate regardless of attendance)*.
   Attendance must **not** be mandatory for Selected applicants.
   - Confirm the status→type mapping (which statuses → `WINNER` vs `PARTICIPATION`).
2. **Contract** — for the not-eligible / not-yet-issued cases, return **`200`** with the
   normal body (`{ eligible, issued, downloadReady, ... }`) instead of a `4xx`. The client
   already renders precise "being prepared / not available yet" states off those flags; a
   `4xx` bypasses them and the page shows a generic "No certificate found."

**Frontend:** endpoint call, IDs and download flow are all correct — no FE change is
required to make eligible certificates appear once the rule above is fixed. (Optional FE
polish, tracked separately: surface the backend `message` for genuinely-ineligible users
instead of the generic "No certificate found.")
