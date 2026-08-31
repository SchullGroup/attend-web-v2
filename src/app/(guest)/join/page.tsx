"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, CalendarDays, Users } from "lucide-react";
import { useGetGuestEvents } from "@/api/guest/hooks";
import { useDebounce } from "@/lib/utils";

// Figma "Web - Redesign" (7B0U0fGXTJGggQEKL0p08X), JOIN AS GUEST section,
// "Guest events" frame — the primary landing for the login page's "Join as a
// Guest/Regulator" link: a searchable browse list of publicly guest-joinable
// events. Backed by GET /api/v1/guest/events (same backend endpoint the
// mobile app already calls directly) via the new /api/guest/events proxy —
// this previously had no web client at all. The sibling "Enter code" frame
// (for events not listed here, e.g. private AGMs needing a proxy/access
// code) lives at ./code.
export default function GuestEventsPage() {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);
  const { data, isLoading } = useGetGuestEvents({ search: debounced, size: 20 });
  const events = data?.data?.events ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        aria-label="Go back"
        className="inline-flex rounded-full bg-white p-2 text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
            Guest events
          </h1>
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/70">
            Join an event without creating an account.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for events"
            className="h-11 w-full rounded-full border border-foreground/5 bg-foreground/[0.03] pl-10 pr-3 text-sm tracking-[-0.14px] placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary"
          />
        </div>
      </div>

      {isLoading && (
        <p className="py-10 text-center text-sm text-foreground/50">Loading events…</p>
      )}

      {!isLoading && events.length === 0 && (
        <div className="py-10 text-center text-sm text-foreground/50">
          No guest events available right now.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/join/${event.id}`}
            className="group overflow-hidden rounded-2xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
          >
            <div
              className="flex h-32 items-center justify-center"
              style={{ backgroundColor: event.branding?.brandColor || "#1f1f1f" }}
            >
              {event.branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.branding.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-white/20">
                  {event.title.charAt(0)}
                </span>
              )}
            </div>
            <div className="space-y-1.5 p-4">
              <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                {event.title}
              </p>
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {event.date}, {event.startTime}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm text-foreground/60">
        Have an access, proxy or QR code instead?{" "}
        <Link href="/join/code" className="font-semibold text-foreground hover:underline">
          Enter it here
        </Link>
      </p>
    </div>
  );
}
