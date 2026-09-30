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
      {/* pt-10, not Figma's pt-16 — a real browser's own chrome (tabs/address bar) eats into
          window height beyond what a bare viewport-height render shows, so the Figma padding
          left less room for the phone than intended at ordinary 90-100% zoom. Freed here rather
          than shrunk on the phone itself, which stays at the size the frame specifies. */}
      <aside className="relative hidden w-[50%] max-w-[720px] flex-col items-center overflow-hidden rounded-2xl bg-black px-10 pt-10 pb-0 text-center md:flex">
        {/* Figma's soft light on the black panel: brightest at the top-right, trailing down the
            right edge beside the phone; the left half stays pure black. Matched by eye to the
            frame (no Figma access for exact values), so tune the two layers together. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 38% 24% at 82% 16%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)",
              "radial-gradient(ellipse 26% 32% at 96% 64%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 100%)",
            ].join(", "),
          }}
        />

        <OnboardingCarousel />
      </aside>

      {/* Right form area — plain white. This carried a soft grey gradient earlier in the
          redesign; it read as dirty against the white page padding, so it's flat now. */}
      <main className="flex w-full flex-col items-center justify-center rounded-2xl bg-white px-6 py-10 md:w-[50%]">
        <div className="flex w-full max-w-[410px] flex-col items-center gap-10">
          <Image src="/attend-logo.png" alt="Attend" width={148} height={35} priority />
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
