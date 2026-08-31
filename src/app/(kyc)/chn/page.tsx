"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lock } from "lucide-react";
import { useKycStep2, useKycStep2Skip } from "@/api/kyc/hooks";

export default function ChnPage() {
  const router = useRouter();
  const [chn, setChn] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isValid = /^[a-zA-Z0-9]{10,}$/.test(chn);

  const { mutate: submitStep2, isPending: submitting } = useKycStep2();
  const { mutate: skipStep2, isPending: skipping } = useKycStep2Skip();
  const busy = submitting || skipping;

  useEffect(() => {
    // Step 1 (BVN) must have run first — it stores the BVN we need for step 3.
    if (!sessionStorage.getItem("kyc_bvn")) {
      router.replace("/bvn");
    }
  }, [router]);

  function handleError(err: any) {
    const msg = err?.response?.data?.message || err?.message || "";
    // CHN already on file — not an error; continue to the liveness step.
    if (/already.*(submitted|verif)/i.test(msg)) {
      router.push("/liveness");
      return;
    }
    setErrorMsg(msg || "Submission failed. Please check your details and try again.");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    submitStep2(
      { chn },
      { onSuccess: () => router.push("/liveness"), onError: handleError },
    );
  }

  function onSkip() {
    setErrorMsg(null);
    skipStep2(undefined, {
      onSuccess: () => router.push("/liveness"),
      onError: handleError,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <Lock className="h-5 w-5 text-gray-700" />
        </div>
        <h1 className="text-xl font-bold text-foreground">CHN — CSCS Clearing House Number</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the CHN issued by the Central Securities Clearing System. You can
          find this on your stockbroker statement.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <Input
        name="chn"
        label="CHN"
        maxLength={20}
        placeholder="e.g. CHN1234567"
        value={chn}
        onChange={(e) => setChn(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        hint="Alphanumeric, at least 10 characters."
      />

      <p className="text-xs text-muted-foreground">
        Don&apos;t have a CHN?{" "}
        <button
          type="button"
          disabled={busy}
          className="underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-50"
          onClick={onSkip}
        >
          Skip for now
        </button>
        {" "}— you can add it later from your profile.
      </p>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => router.push("/bvn")}
          disabled={busy}
        >
          Back
        </Button>
        <Button type="submit" fullWidth loading={submitting} disabled={!isValid || busy}>
          {submitting ? "Submitting…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
