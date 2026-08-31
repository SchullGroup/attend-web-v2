"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Fingerprint, FileCheck2, Lock } from "lucide-react";

export default function KycIntroPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Verify your identity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          To take part in AGMs and shareholder votes, we need to confirm a few
          details. This takes about 2 minutes.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { icon: Fingerprint, t: "BVN", d: "Your 11-digit Bank Verification Number" },
          { icon: Lock, t: "CHN (Optional)", d: "Your CSCS Clearing House Number — can be skipped and added later" },
          { icon: FileCheck2, t: "Liveness Check", d: "A quick face scan to confirm you are the account holder" },
        ].map(({ icon: Icon, t, d }) => (
          <div
            key={t}
            className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3"
          >
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Your information is encrypted and used solely to verify your eligibility for
        shareholder events. We never share your details with third parties.
      </p>

      <Link href="/bvn" className="block">
        <Button fullWidth size="lg">
          Begin verification
        </Button>
      </Link>
    </div>
  );
}
