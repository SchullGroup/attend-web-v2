"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Shell for the verification URLs. The 3-step progress bubbles that used to live here went
// with the full-page wizard — verification is one sheet now (VerifyIdentitySheet), which
// carries its own stage progression and portals above whatever page hosts it.
//
// Only /success still renders real page content, so it keeps the white card. The other
// routes are modal hosts: they render just this header, which sits behind the sheet.
export default function KycLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSuccess = pathname?.endsWith("/success");

  return (
    <div className="min-h-screen bg-foreground/[0.02]">
      <header className="border-b border-foreground/[0.06] bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex flex-col gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/attend-logo.png" alt="Attend" style={{ height: 36, width: "auto" }} />
            <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/60">
              Identity Verification
            </p>
          </div>
          <Link href="/" className="text-sm text-foreground/60 transition-colors hover:text-foreground">
            Skip for now
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        {isSuccess ? (
          <div className="rounded-xl border border-foreground/[0.06] bg-white p-8 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            {children}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
