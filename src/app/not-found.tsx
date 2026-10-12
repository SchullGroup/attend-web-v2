"use client";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

// Shown for any URL that doesn't match a page (and wherever a page calls notFound()). It renders
// inside the root layout only, without the app shell, because a broken link can arrive signed out
// as easily as signed in. Same look as Home's empty state: the faint Attend wordmark behind a
// short note.
export default function NotFound() {
  function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/";
  }

  return (
    <main className="flex min-h-screen flex-col bg-white md:bg-[#f6f6f6]">
      <header className="px-6 py-6 md:px-10">
        <Link href="/" aria-label="Attend home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/attend-logo.png" alt="Attend" style={{ height: 22, width: "auto" }} />
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <p
            aria-hidden
            className="select-none text-[120px] font-semibold leading-none tracking-[-6px] text-[#0A3D2E]/10 sm:text-[168px]"
          >
            404
          </p>
        </div>

        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          This page isn&apos;t on the calendar
        </h1>
        <p className="mt-2 max-w-sm text-sm tracking-[-0.14px] text-foreground/60">
          The link may be broken, or the page may have moved. Check the address, or head back to
          your events.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A3D2E] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" /> Go to Home
          </Link>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/4"
          >
            <ArrowLeft className="h-4 w-4" /> Go back
          </button>
        </div>
      </section>
    </main>
  );
}
