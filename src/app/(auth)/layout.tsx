import Image from "next/image";
import { OnboardingCarousel } from "@/components/attend/OnboardingCarousel";

// Figma "Web - Redesign" / ONBOARDING (777:3391) — a persistent split shell:
// a fixed dark brand panel on the left (auto-advancing OnboardingCarousel),
// swappable auth forms on the right. Every auth page
// (login/register/verify/forgot/reset/bvn-recover) renders inside this shell.
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

        <OnboardingCarousel />
      </aside>

      {/* Right form area — Figma sits the form on a soft light gradient, not flat white. */}
      <main
        className="flex w-full flex-col items-center justify-center rounded-2xl px-6 py-10 md:w-[55%]"
        style={{
          background:
            "linear-gradient(160deg, #ffffff 0%, #f7f8fa 45%, #eef1f6 100%)",
        }}
      >
        <div className="flex w-full max-w-[410px] flex-col items-center gap-10">
          <Image src="/attend-logo.png" alt="Attend" width={148} height={35} priority />
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
