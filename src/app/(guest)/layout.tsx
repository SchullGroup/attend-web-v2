import "@/app/globals.css";

// Item B — Minimal shell for non-shareholder guests. No main dashboard nav.

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <img src="/attend-logo.png" alt="Attend" style={{ height: 24 }} />
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            GUEST
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
