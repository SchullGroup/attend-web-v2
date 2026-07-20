"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Building2,
  Rocket,
  Lightbulb,
  CalendarDays,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { useGetMe } from "@/api/auth/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { useUserStore } from "@/lib/user-store";
import { cn, formatDate, greetingByHour, initialsFor, formatEventFormat } from "@/lib/utils";

const TILES = [
  {
    label: "AGM",
    description: "Vote at shareholder meetings",
    href: "/agm",
    icon: Building2,
    gradient: "from-gray-800 to-gray-950",
  },
  {
    label: "Launches",
    description: "Product reveals & launches",
    href: "/events",
    icon: Rocket,
    gradient: "from-orange-500 to-rose-500",
  },
  {
    label: "Innovation",
    description: "Innovation challenges",
    href: "/hackathon",
    icon: Lightbulb,
    gradient: "from-purple-600 to-fuchsia-600",
  },
  {
    label: "General",
    description: "Roundtables & conferences",
    href: "/general",
    icon: CalendarDays,
    gradient: "from-teal-500 to-cyan-600",
  },
];

const CAROUSEL_IMAGES: Record<string, string> = {
  LAUNCH:   "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80",
  HACKATHON:"https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80",
  GENERAL:  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=900&q=80",
};

const MODULE_BADGE: Record<string, { label: string; bg: string }> = {
  LAUNCH:   { label: "Product Launch",      bg: "#ea6c00" },
  HACKATHON:{ label: "Innovation Challenge", bg: "#7c22c9" },
  GENERAL:  { label: "General Event",        bg: "#0891b2" },
};

const EVENT_COLOR: Record<string, string> = {
  AGM: "#1a6b3c",
  PRODUCT_LAUNCH: "#f97316",
  LAUNCH: "#f97316",
  HACKATHON: "#9333ea",
  INNOVATION_CHALLENGE: "#9333ea",
  GENERAL_EVENT: "#2563eb",
  GENERAL: "#2563eb",
};

// Normalise an API event into the shape the design JSX consumes.
interface HomeEvent {
  id: string;
  module: string;
  organiser: string;
  title: string;
  date: string;
  format: string;
  startTime: string;
  rsvpCount: number;
  thumbnailColor: string;
  rsvpStatus?: boolean;
}
function toHomeEvent(e: EventListItem): HomeEvent {
  return {
    id: e.id,
    module: e.eventType,
    organiser: e.registerName || e.organizerName,
    title: e.title,
    date: e.date,
    format: e.format,
    startTime: e.startTime,
    rsvpCount: e.maximumCapacity || 0,
    thumbnailColor: EVENT_COLOR[e.eventType?.toUpperCase()] ?? "#2563eb",
    rsvpStatus: e.registered,
  };
}

export default function HomePage() {
  const { data: meResp } = useGetMe();
  const me = meResp?.data;
  const displayName = me?.fullName || "there";
  const firstName = displayName.split(" ")[0];

  const { kycStatus } = useUserStore();
  const verified = kycStatus === "full";

  const { data: evResp } = useGetEvents();
  const apiEvents = evResp?.data?.events ?? [];

  const liveEvent: HomeEvent | undefined = (() => {
    const live = apiEvents.find((e) => e.status === "LIVE");
    return live ? toHomeEvent(live) : undefined;
  })();

  const upcoming: HomeEvent[] = apiEvents
    .filter((e) => e.status === "PUBLISHED")
    .slice(0, 4)
    .map(toHomeEvent);

  // Featured events come straight from the endpoint (admin marks an event
  // featured → EventItem.featured === true).
  const carouselEvents: HomeEvent[] = apiEvents
    .filter((e) => e.featured)
    .slice(0, 5)
    .map(toHomeEvent);

  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (carouselEvents.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselEvents.length);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [carouselEvents.length]);

  return (
    <div className="space-y-8">
      {/* Hero / user card */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#111827] via-[#1f2937] to-[#374151] p-6 text-white md:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur">
              {me?.initials || initialsFor(displayName)}
            </div>
            <div>
              <p className="text-sm text-white/80">
                {greetingByHour()},
              </p>
              <h1 className="text-2xl font-bold leading-tight md:text-3xl">
                {firstName}
              </h1>
              <p className="mt-0.5 text-xs text-white/70">
                {me?.role || "Member"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" /> KYC verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 backdrop-blur">
                <AlertCircle className="h-3.5 w-3.5" /> KYC pending
              </span>
            )}
          </div>
        </div>

        {!verified && (
          <Link
            href="/intro"
            className="relative mt-5 flex items-center justify-between rounded-2xl border border-amber-300/50 bg-amber-400/20 px-4 py-3 text-sm font-medium backdrop-blur transition-colors hover:bg-amber-400/30"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Complete verification to vote in AGMs
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      {/* Live AGM card */}
      {liveEvent && (
        <section>
          <Link
            href={(liveEvent.module === "AGM" || liveEvent.module === "AGM_EGM") ? `/agm/live?eventId=${liveEvent.id}` : `/events/${liveEvent.id}`}
            className="group block overflow-hidden rounded-2xl bg-[#1e293b] p-5 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    Live Now
                  </span>
                  {(liveEvent.module === "AGM" || liveEvent.module === "AGM_EGM") && (
                    <span className="text-xs text-white/50">AGM · {liveEvent.organiser}</span>
                  )}
                </div>
                <p className="text-base font-bold text-white leading-snug md:text-lg">
                  {liveEvent.title.split("—")[1]?.trim() ?? liveEvent.title}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {(liveEvent.module === "AGM" || liveEvent.module === "AGM_EGM") ? "Voting is open · Click to join and vote" : `${liveEvent.rsvpCount.toLocaleString()} watching`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors group-hover:bg-white/20">
                <Radio className="h-4 w-4" /> Join
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Module tiles */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Explore
        </h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.label}
                href={t.href}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
                  t.gradient,
                )}
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                <div className="relative flex h-full flex-col">
                  <Icon className="h-6 w-6" />
                  <div className="mt-6">
                    <p className="text-lg font-bold">{t.label}</p>
                    <p className="text-xs text-white/80">{t.description}</p>
                  </div>
                  <ChevronRight className="absolute bottom-0 right-0 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Events Carousel */}
      {carouselEvents.length > 0 && (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Featured Events
          </h2>
          <Link href="/events" className="text-xs font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl" style={{ height: 240 }}>
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {carouselEvents.map((event) => {
              const badge = MODULE_BADGE[event.module] ?? MODULE_BADGE.GENERAL;
              const imageUri = CAROUSEL_IMAGES[event.module] ?? CAROUSEL_IMAGES.GENERAL;
              const href = event.module === "HACKATHON" ? "/hackathon" : `/events/${event.id}`;
              return (
                <Link
                  key={event.id}
                  href={href}
                  className="relative h-full w-full shrink-0"
                  style={{ minWidth: "100%" }}
                >
                  {/* Photo */}
                  <img
                    src={imageUri}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-b from-transparent via-black/20 to-black/80" />

                  {/* Module badge */}
                  <div className="absolute left-4 top-4">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-white leading-snug">
                        {event.title.split("—")[1]?.trim() ?? event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-white/75">{event.organiser}</p>
                      <p className="text-xs text-white/60">
                        {formatDate(event.date)} · {event.format}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                      {event.rsvpStatus ? "Registered" : "Register"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dot indicators */}
        {carouselEvents.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {carouselEvents.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activeSlide ? "w-5 bg-foreground" : "w-1.5 bg-gray-300"
                )}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {/* Upcoming */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming events
          </h2>
          <Link href="/events" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {upcoming.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 transition-colors hover:bg-muted/40"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ background: e.thumbnailColor }}
              >
                {initialsFor(e.organiser)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {e.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.date)} · {formatEventFormat(e.format)} · {e.startTime}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
