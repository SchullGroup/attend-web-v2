import Link from "next/link";

// Item B — Minimal shell for non-shareholder guests. No main dashboard nav
// (NavShell is for signed-in users only) — this is a public, unauthenticated
// flow, so it gets the same lightweight visual language as the (auth) pages:
// a soft ambient gradient wash, the wordmark top-left, and a "Login" way out
// top-right for anyone who lands here by mistake. Figma "Web - Redesign"
// (7B0U0fGXTJGggQEKL0p08X) / JOIN AS GUEST section, node 777:4740.
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-foreground">
      {/* Ambient gradient wash — matches the faint multi-hue aurora behind
          every JOIN AS GUEST frame in Figma (near-white, barely-there). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 12% 8%, rgba(244,114,182,0.16) 0%, rgba(244,114,182,0) 60%), " +
            "radial-gradient(ellipse 50% 45% at 88% 20%, rgba(5,122,70,0.12) 0%, rgba(5,122,70,0) 60%), " +
            "radial-gradient(ellipse 45% 40% at 78% 90%, rgba(96,165,250,0.14) 0%, rgba(96,165,250,0) 60%)",
        }}
      />

      <header className="flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <img src="/attend-logo.png" alt="Attend" style={{ height: 26, width: "auto" }} />
        <Link
          href="/login"
          className="flex h-10 items-center justify-center rounded-xl bg-foreground/[0.05] px-5 text-sm font-medium tracking-[-0.14px] text-foreground transition-colors hover:bg-foreground/[0.08]"
        >
          Login
        </Link>
      </header>

      <main className="flex justify-center px-6 pb-16 pt-4 md:px-10">
        {/* Each page sets its own inner max-width — the "Guest events" browse
            grid needs to run much wider than the narrow "Enter code" form. */}
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
