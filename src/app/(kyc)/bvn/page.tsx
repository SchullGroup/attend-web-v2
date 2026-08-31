"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Fingerprint, ShieldCheck, Calendar, AlertCircle, ChevronDown, CheckCircle2 } from "lucide-react";
import { useKycStep1, useGetKycStatus } from "@/api/kyc/hooks";
import { useGetMe } from "@/api/auth/hooks";
import { cn } from "@/lib/utils";

export default function BvnPage() {
  const router = useRouter();
  const { data: meData } = useGetMe();
  const currentUser = meData?.data;

  // A BVN already accepted by the backend must not be re-submitted ΓÇö resuming users
  // landed here and were asked to re-enter details that were already verified.
  const { data: kycResp } = useGetKycStatus();
  const step1 = kycResp?.data?.steps?.step1;
  const alreadyVerified = !!step1?.completed;

  // Regulatory consent ΓÇö an un-ticked checkbox gates the submit button, with the
  // full NDPA/CBN disclosure available inline rather than behind a blocking modal.
  const [hasConsented, setHasConsented] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isBvnValid = /^\d{11}$/.test(bvn);
  const isDobValid = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(dob);
  const isValid = isBvnValid && isDobValid && hasConsented;

  const { mutate: submitStep1, isPending } = useKycStep1();

  function handleDobChange(rawVal: string) {
    const digits = rawVal.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) {
      setDob(digits);
    } else if (digits.length <= 4) {
      setDob(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setDob(`${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setErrorMsg(null);

    const firstName = currentUser?.firstName || "";
    const lastName = currentUser?.lastName || "";

    // Convert DD/MM/YYYY to YYYY-MM-DD ISO string for backend
    const [day, month, year] = dob.split("/");
    const isoDob = `${year}-${month}-${day}`;

    const payload: {
      bvn: string;
      dob: string;
      firstName?: string;
      lastName?: string;
      consent: boolean;
      hasConsent: boolean;
      bvnConsent: boolean;
      consentToBvnLookup: boolean;
    } = {
      bvn,
      dob: isoDob,
      consent: true,
      hasConsent: true,
      bvnConsent: true,
      consentToBvnLookup: true,
    };
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;

    submitStep1(
      payload,
      {
        onSuccess: () => {
          router.push("/chn");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.message || "";
          if (/already.*verif/i.test(msg)) {
            router.push("/chn");
            return;
          }
          setErrorMsg(msg || "We couldn't verify your BVN. Please check your BVN and Date of Birth and try again.");
        },
      },
    );
  }

  if (alreadyVerified) {
    return (
      <div className="space-y-6">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">BVN already verified</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step1?.pendingReview
              ? "Your BVN is on file and awaiting review. There's nothing more to do on this step."
              : "We've already confirmed your BVN, so you can skip straight to the next step."}
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={() => router.push("/intro")}>
            Back
          </Button>
          <Button fullWidth onClick={() => router.push("/chn")}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* BVN & DOB INPUT FORM */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <Fingerprint className="h-5 w-5 text-gray-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Bank Verification Number</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your 11-digit BVN and Date of Birth to verify your identity.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <Input
          name="bvn"
          label="BVN (11 Digits)"
          inputMode="numeric"
          placeholder="22XXXXXXXXX"
          value={bvn}
          onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
          hint={`${bvn.length}/11 digits ΓÇö processed securely with Dojah.`}
        />

        <Input
          name="dob"
          label="Date of Birth (DD/MM/YYYY)"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          leftIcon={<Calendar className="h-4 w-4" />}
          value={dob}
          onChange={(e) => handleDobChange(e.target.value)}
          hint="Format: Day/Month/Year (e.g. 15/08/1995) ΓÇö must match your BVN record."
        />

        {/* MANDATORY REGULATORY CONSENT ΓÇö un-ticked by default, gates submit */}
        <div className="space-y-3 rounded-2xl border border-border bg-slate-50/60 p-4">
          <label
            htmlFor="bvnConsent"
            className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-foreground"
          >
            <input
              id="bvnConsent"
              name="bvnConsent"
              type="checkbox"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              I consent to the processing of my BVN and Date of Birth for identity
              verification.
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowDisclosure((v) => !v)}
            aria-expanded={showDisclosure}
            aria-controls="bvnDisclosure"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Read regulatory disclosure
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showDisclosure && "rotate-180",
              )}
            />
          </button>

          {showDisclosure && (
            <div id="bvnDisclosure" className="space-y-3">
              <div className="space-y-3 rounded-xl border border-border bg-white p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    NDPA &amp; CBN Regulatory Notice
                  </span>
                </div>
                <p className="font-semibold text-foreground">
                  Pursuant to the Nigeria Data Protection Act (NDPA 2023) &amp; CBN
                  Regulations:
                </p>
                <ul className="list-disc space-y-1.5 pl-4 leading-relaxed">
                  <li>
                    We require your explicit consent to retrieve and validate your BVN
                    biodata (Full Name, Date of Birth, Phone Number, Gender, and Photo)
                    via our licensed verification partners (Dojah / NIBSS).
                  </li>
                  <li>
                    Your identity details are used <strong>solely</strong> to verify your
                    eligibility for shareholder participation and voting.
                  </li>
                  <li>
                    Your BVN will <strong>never</strong> be shared with unauthorized third
                    parties or used to access your bank accounts.
                  </li>
                </ul>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  By ticking the box above, you authorize Attend and its licensed partners
                  to verify your BVN details.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => router.push("/intro")}
            disabled={isPending}
          >
            Back
          </Button>
          <Button type="submit" fullWidth loading={isPending} disabled={!isValid}>
            {isPending ? "VerifyingΓÇª" : "Continue"}
          </Button>
        </div>
      </form>
    </>
  );
}
