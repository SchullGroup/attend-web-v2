import Image from "next/image";

// Figma "Web - Redesign" / ONBOARDING (777:3391) — a persistent split shell:
// a fixed dark brand panel on the left (headline + phone mockup, identical
// copy to the mobile app's own onboarding carousel), swappable auth forms on
// the right. Every auth page (login/register/verify/forgot/reset/bvn-recover)
// renders inside this same shell.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-stretch bg-white p-2 md:p-3">
      {/* Left brand panel — hidden below md, matches the mobile-web breakpoint's
          stacked layout being a separate design (not built from this shell). */}
      <aside className="relative hidden w-[45%] max-w-[640px] flex-col items-center overflow-hidden rounded-2xl bg-black px-10 pt-16 pb-0 text-center md:flex">
        {/* Ambient glow, approximating Figma's radial highlight behind the phone */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[560px] w-[560px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)" }}
        />

        {/* Progress dots — decorative, matches every auth-state reference 1:1 */}
        <div className="relative z-10 flex w-14 items-center gap-1">
          <div className="h-[5px] flex-1 rounded-full bg-white" />
          <div className="h-[5px] flex-1 rounded-full bg-white/10" />
          <div className="h-[5px] flex-1 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10 mt-14 flex w-full max-w-[342px] flex-col gap-6">
          <h1
            className="whitespace-pre-line text-white"
            style={{
              fontFamily: "Outfit",
              fontWeight: 600,
              fontSize: 80,
              lineHeight: 0.8,
              letterSpacing: -3.2,
            }}
          >
            {"Every\nvoice\ncounts."}
          </h1>
          <p className="text-sm leading-[1.4] tracking-[-0.28px] text-white/80">
            Join shareholder meetings, follow proceedings, participate in
            discussions &amp; vote securely from anywhere.
          </p>
        </div>

        {/* Phone mockup — bleeds off the bottom of the card, per Figma's overflow-clip */}
        <div className="relative z-10 mt-10 w-[295px] max-w-full flex-1">
          <Image
            src="/auth/phone-mockup-agm.png"
            alt=""
            width={305}
            height={405}
            className="w-full object-cover object-top"
            priority
          />
        </div>
      </aside>

      {/* Right form area */}
      <main className="flex w-full flex-col items-center justify-center px-6 py-10 md:w-[55%]">
        <div className="flex w-full max-w-[410px] flex-col items-center gap-10">
          <Image src="/attend-logo.png" alt="Attend" width={148} height={35} priority />
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
