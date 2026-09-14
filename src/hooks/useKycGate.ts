"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { kycKeys } from "@/api/kyc/hooks";
import { isKycFull } from "@/lib/kyc-gate";
import type { KycStatusData, KycStatusResponse } from "@/types";

// Shared by every AGM surface that lets someone act without being FULL_KYC verified first
// (events/[id] and LiveRoom): stash the attempted action, prompt, and replay it once verified.
//
// Browsing is free everywhere now — nothing auto-opens this. It only ever opens because the
// caller invoked requireKyc() from a real click, so dismissing it just closes the sheet and
// drops the pending action; there is nothing to bounce away from.
export function useKycGate(kyc?: KycStatusData) {
  const queryClient = useQueryClient();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const kycFull = isKycFull(kyc);

  function requireKyc(action: () => void) {
    if (kycFull) {
      action();
      return;
    }
    pendingAction.current = action;
    setVerifyOpen(true);
  }

  function runPendingKycAction() {
    const action = pendingAction.current;
    pendingAction.current = null;
    if (!action) return;

    // Re-read from the cache rather than trusting `kycFull` from this render. Completing
    // verification does not guarantee FULL_KYC — it can land in the officer review queue —
    // and useKycStep3/useNinSelfie-style flows await their own invalidation, so the cache is
    // authoritative here.
    const fresh = queryClient.getQueryData<KycStatusResponse>(kycKeys.status);
    if (!isKycFull(fresh?.data)) return;

    action();
  }

  function closeVerify() {
    pendingAction.current = null;
    setVerifyOpen(false);
  }

  return { verifyOpen, kycFull, requireKyc, runPendingKycAction, closeVerify };
}
