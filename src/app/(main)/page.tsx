"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Building2,
  Lightbulb,
  Rocket,
  Clock,
  Radio,
} from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { useGetMe } from "@/api/auth/hooks";
import { useUserStore } from "@/lib/user-store";
import { EventListItem } from "@/types";
import { cn, formatDate } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Home / Dashboard — built to the Figma DESIGN (node 777-3136), NOT to the
// figma-redesign branch's `(main)/page.tsx` (that file ships a stripped-down
// "All events" list, which is actually a different screen in the design — the
// flat cross-module browser — and omits this dashboard entirely).
//
// Sections, matching the mockup top-to-bottom:
//   • Greeting hero ("Good <time>, <name>" + "Stay connected to what matters.")
//   • Live now  — horizontal carousel of LIVE events → the live room.
//   • Discover Events — AGM / Innovation / Launch Events tiles → each section.
//   • Upcoming Events — horizontal carousel of not-yet-started events → detail.
//   • Browse All Events — dark-green CTA banner → the events browser.
//
// Data note: the design shows "2,000 watching" and "120 Applied" counts, but
// those live on EventDetail (registeredCount), NOT on the EventListItem the
// list endpoint returns — so the cards below show the honest fields we DO have
// (date/time, live state) rather than fabricate a number. Wire the counts in
// if/when the list endpoint carries them.
//
// All wiring is OUR logic: useGetEvents, useGetMe (greeting name), useUserStore
// (KYC gate for the verification nudge). No new endpoints.
// ─────────────────────────────────────────────────────────────────────────────

const isAgm = (t: string) => t === "AGM" || t === "AGM_EGM";
const isInnovation = (t: string) => t === "HACKATHON" || t === "INNOVATION_CHALLENGE";

const MODULE_ICON: Record<string, typeof Building2> = {
  agm: Building2,
  innovation: Lightbulb,
  launch: Rocket,
};
function moduleOf(t: string): "agm" | "innovation" | "launch" {
  if (isAgm(t)) return "agm";
  if (isInnovation(t)) return "innovation";
  return "launch";
}

// Deterministic pastel tile per organiser, matching the mobile app's approach
// (used only when an event has no flyer/banner image of its own).
const TILE_TINTS = ["#f9b6ff", "#8ba6ff", "#c3e1d0", "#dbe1c3", "#f6f6f6", "#e2e2e2"];
function tileTint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return TILE_TINTS[h % TILE_TINTS.length];
}

function fmtTime(startTime?: string) {
  if (!startTime) return "--";
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return startTime;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

const imageOf = (e: EventListItem) => e.flyerUrl || e.bannerUrl || null;

// Detail route per module. The dedicated `/agm/[id]` route doesn't exist in
// this repo — AGM detail is served by `/events/[id]` (same as the AGM list).
function hrefFor(e: EventListItem) {
  if (isInnovation(e.eventType)) return `/hackathon/${e.id}`;
  return `/events/${e.id}`;
}
// A LIVE event joins its live room: AGMs vote in `/agm/live`, everything else
// streams in `/events/live` (both take the id as a query param).
function liveHref(e: EventListItem) {
  return isAgm(e.eventType)
    ? `/agm/live?eventId=${e.id}`
    : `/events/live?eventId=${e.id}`;
}

export default function HomePage() {
  const { data: evResp, isLoading } = useGetEvents({ size: 100 });
  const allEvents = evResp?.data?.events ?? [];

  const { data: meResp } = useGetMe();
  const firstName =
    meResp?.data?.firstName || meResp?.data?.fullName?.split(" ")[0] || "there";

  const { kycStatus } = useUserStore();
  const verified = kycStatus === "full";

  // Computed after mount so server/client hours can't mismatch during hydration.
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const liveEvents = useMemo(
    () => allEvents.filter((e) => e.status === "LIVE"),
    [allEvents],
  );
  const upcoming = useMemo(
    () =>
      allEvents.filter(
        (e) => e.status !== "ENDED" && e.status !== "LIVE" && e.status !== "CANCELLED",
      ),
    [allEvents],
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting hero */}
      <div className="flex flex-col gap-1">
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          {greeting}, {firstName}
        </p>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Stay connected to what matters.
        </h1>
      </div>

      {/* KYC-pending nudge (our functional re-add) — figma's amber nudge style. */}
      {!verified && (
        <Link
          href="/intro"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <span>Complete identity verification to vote in AGMs</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* Live now */}
      {(isLoading || liveEvents.length > 0) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-medium tracking-[-0.32px] text-foreground">
              <span className="flex h-2 w-2 items-center justify-center">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              </span>
              Live now
            </h2>
            {liveEvents.length > 0 && (
              <Link
                href="/events"
                className="text-sm font-medium tracking-[-0.14px] text-foreground underline underline-offset-2"
              >
                View all
              </Link>
            )}
          </div>

          {isLoading ? (
            <CarouselSkeleton />
          ) : (
            <div className="flex snap-x gap-4 overflow-x-auto pb-1">
              {liveEvents.map((e) => (
                <LiveCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Discover Events */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">
            Discover Events
          </h2>
          <p className="text-sm tracking-[-0.14px] text-foreground/60">
            Find events that interest you
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DiscoverTile
            href="/agm"
            icon={Building2}
            label="AGM"
            desc="Join shareholder meetings and vote on resolutions"
            tint="#c3e1d0"
          />
          <DiscoverTile
            href="/hackathon"
            icon={Lightbulb}
            label="Innovation"
            desc="Compete in innovation challenges and build to win"
            tint="#f9b6ff"
          />
          <DiscoverTile
            href="/events"
            icon={Rocket}
            label="Launch Events"
            desc="Follow product launches and live company events"
            tint="#8ba6ff"
          />
        </div>
      </section>

      {/* Upcoming Events */}
      {(isLoading || upcoming.length > 0) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">
              Upcoming Events
            </h2>
            {upcoming.length > 0 && (
              <Link
                href="/events"
                className="text-sm font-medium tracking-[-0.14px] text-foreground underline underline-offset-2"
              >
                View all
              </Link>
            )}
          </div>

          {isLoading ? (
            <CarouselSkeleton />
          ) : (
            <div className="flex snap-x gap-4 overflow-x-auto pb-1">
              {upcoming.map((e) => (
                <UpcomingCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Browse All Events banner */}
      <Link
        href="/events"
        className="flex items-center justify-between gap-4 rounded-xl px-5 py-5 text-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "#0A3D2E" }}
      >
        <div className="min-w-0">
          <p className="text-base font-medium tracking-[-0.32px]">Browse All Events</p>
          <p className="text-sm tracking-[-0.14px] text-white/70">
            Hundreds of events waiting for you
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium tracking-[-0.14px] text-[#0A3D2E]">
          Explore
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

// ── Live card ────────────────────────────────────────────────────────────────
function LiveCard({ event: e }: { event: EventListItem }) {
  const img = imageOf(e);
  const organiser = e.registerName || e.organizerName;
  const Icon = MODULE_ICON[moduleOf(e.eventType)];
  return (
    <Link
      href={liveHref(e)}
      className="flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <div
        className="relative h-[168px] w-full overflow-hidden"
        style={{ backgroundColor: tileTint(organiser || e.title) }}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover"
            onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-8 w-8 text-foreground/50" strokeWidth={1.75} />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Live now
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
          {e.title}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-foreground/60">
          <Radio className="h-3.5 w-3.5" />
          {isAgm(e.eventType) ? "Voting open · Join to vote" : "Happening now · Join"}
        </p>
      </div>
    </Link>
  );
}

// ── Upcoming card ──────────────────────────────────────────────────────────��─
function UpcomingCard({ event: e }: { event: EventListItem }) {
  const img = imageOf(e);
  const organiser = e.registerName || e.organizerName;
  const Icon = MODULE_ICON[moduleOf(e.eventType)];
  return (
    <Link
      href={hrefFor(e)}
      className="flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <div
        className="relative h-[150px] w-full overflow-hidden"
        style={{ backgroundColor: tileTint(organiser || e.title) }}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover"
            onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-8 w-8 text-foreground/50" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
          {e.title}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-foreground/60">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(e.date)}, {fmtTime(e.startTime)}
        </p>
      </div>
    </Link>
  );
}

// ── Discover tile ──────────────────────────────────────────────────────────��─
function DiscoverTile({
  href,
  icon: Icon,
  label,
  desc,
  tint,
}: {
  href: string;
  icon: typeof Building2;
  label: string;
  desc: string;
  tint: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: tint }}
      >
        <Icon className="h-5 w-5 text-foreground/70" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{label}</p>
        <p className="text-xs leading-snug text-foreground/60">{desc}</p>
      </div>
    </Link>
  );
}

// ── Loading skeleton for a carousel row ───────────────────────────────────────
function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[0, 1, 2].map((n) => (
        <div
          key={n}
          className={cn(
            "h-[232px] w-[280px] shrink-0 animate-pulse rounded-xl border border-foreground/[0.06] bg-foreground/[0.04]",
          )}
        />
      ))}
    </div>
  );
}
