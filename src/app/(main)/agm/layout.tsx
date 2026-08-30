"use client";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useUserStore } from "@/lib/user-store";
import { Button } from "@/components/ui/Button";

export default function AgmLayout({ children }: { children: React.ReactNode }) {
  const { kycStatus } = useUserStore();

  if (kycStatus !== "full") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-sm flex flex-col gap-6 px-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Identity verification required</h1>
            <p className="mt-2 text-sm tracking-[-0.14px] text-foreground/60">
              Complete your KYC to access Annual General Meetings, cast votes on resolutions, and appoint proxies.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/intro" className="block">
              <Button size="lg" fullWidth>Start verification</Button>
            </Link>
            <Link href="/" className="block">
              <Button
                size="lg"
                fullWidth
                className="bg-foreground/[0.04] text-foreground/60 shadow-none hover:bg-foreground/[0.08]"
              >
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
