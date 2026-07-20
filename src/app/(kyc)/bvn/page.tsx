"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Fingerprint } from "lucide-react";
import { useKycStep1 } from "@/api/kyc/hooks";

export default function BvnPage() {
  const router = useRouter();
  const [bvn, setBvn] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isValid = /^\d{11}$/.test(bvn);

  const { mutate: submitStep1, isPending } = useKycStep1();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    submitStep1(
      { bvn },
      {
        onSuccess: () => {
          // BVN is needed again for the step 3 liveness check.
          sessionStorage.setItem("kyc_bvn", bvn);
          router.push("/chn");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.message || "";
          // BVN already verified on this account — not an error; move on to CHN.
          if (/already.*verif/i.test(msg)) {
            sessionStorage.setItem("kyc_bvn", bvn);
            router.push("/chn");
            return;
          }
          setErrorMsg(msg || "We couldn't verify that BVN. Please check and try again.");
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <Fingerprint className="h-5 w-5 text-gray-700" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Bank Verification Number</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your 11-digit BVN. You can find this by dialing *565*0# on your
          registered mobile line.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <Input
        name="bvn"
        label="BVN"
        inputMode="numeric"
        placeholder="22XXXXXXXXX"
        value={bvn}
        onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
        hint={`${bvn.length}/11 digits — your BVN never leaves our secure verification partner.`}
      />

      <div className="flex gap-3">
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
          {isPending ? "Verifying…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
