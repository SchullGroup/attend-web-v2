// The KYC step pages hand one value forward: a selfie already matched during step 1, so
// step 3 doesn't ask the user to pose for the camera a second time.
//
// The BVN used to be kept here too. It isn't any more, and must not come back — a BVN in
// localStorage stays readable on a shared machine long after the session ends. The BVN
// needed for the step-3 selfie re-check is read from `GET /participant/kyc`, which returns
// it once step 1 is on file.
//
// The selfie is cleared as soon as step 3 submits, and on an explicit skip.
const SELFIE_KEY = "kyc_selfie";

// A BVN written by an earlier build of the app is still sitting in storage on devices that
// have used the KYC flow before. Clear it on first load so the removal reaches users who
// already have one, not just new sessions.
const LEGACY_BVN_KEY = "kyc_bvn";

const canUseStorage = () => typeof window !== "undefined";

// localStorage throws in private-mode Safari and when a quota is exhausted. KYC progress
// is a convenience, never the source of truth (the backend is), so a storage failure must
// not break the flow — it just means the fast path is unavailable.
function safeGet(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the flow still works, just without the fast path */
  }
}

function safeRemove(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
    // Clear the old sessionStorage location too, so a half-migrated tab doesn't keep
    // resurrecting a stale value after the localStorage copy is gone.
    window.sessionStorage.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
}

export const getStoredSelfie = () => safeGet(SELFIE_KEY);
export const setStoredSelfie = (selfie: string) => safeSet(SELFIE_KEY, selfie);

/**
 * Delete any BVN left behind by an earlier build. Safe to call repeatedly and on every
 * load — it only removes a key nothing writes any more.
 */
export function purgeLegacyStoredBvn() {
  safeRemove(LEGACY_BVN_KEY);
}

export function clearKycProgress() {
  safeRemove(SELFIE_KEY);
  purgeLegacyStoredBvn();
}

// `KYC_STEP_PATHS`, `resumePath()` and `completedStepCount()` lived here to drive the old
// full-page /bvn → /chn → /liveness wizard and its step indicator. That wizard is gone —
// verification is one sheet now (VerifyIdentitySheet), which works out its own starting stage
// from `steps.step1.completed` — so all three were left without a single caller and have been
// removed. `clearKycProgress` and `purgeLegacyStoredBvn` above are still in use.
