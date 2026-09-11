"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightCircle,
  Building2,
  Lightbulb,
  Rocket,
  Clock,
  Radio,
  Users,
} from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { useGetMe } from "@/api/auth/hooks";
import { EventListItem } from "@/types";
import { eventArtwork } from "@/components/attend/EventThumb";
import { CardCarousel } from "@/components/attend/CardCarousel";
import { posterForEventType } from "@/lib/posters";
import { cn, formatShortDate, tileTint } from "@/lib/utils";

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
// Data note: the design shows "2,000 watching" on live cards and "120 Applied" on
// upcoming ones.
//   • The attendee count IS wired: UpcomingCard reads `rsvpCount` and shows it only when
//     the list response actually carries it (see the type note on EventListItem).
//   • The viewer count is NOT, and can't be from here — there's no such field on the list
//     response. LiveRoom derives one from the per-event quorum endpoint, which is gated on
//     being live and registered, so live cards show "Happening now · Join" instead of a
//     fabricated number.
//
// All wiring is OUR logic: useGetEvents and useGetMe (greeting name). No new endpoints.
// The KYC nudge and its query moved out to KycNudgeBanner, and are no longer mounted here.
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


function fmtTime(startTime?: string) {
  if (!startTime) return "--";
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return startTime;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

// Artwork for a card: the best of the event's own flyer/banner and the organiser's logo, else
// nothing (the caller shows a tinted module icon). The ordering — and the reason
// `branding.logoUrl` beats `organizerLogo` — lives with `eventArtwork`, which every list row
// shares. This card can't fall through tiers on a 404 the way `EventThumb` does, since the
// image is a background layer here rather than the whole tile.
//
// Flyer and logo are treated identically — both fill the card edge to edge (`object-cover`).
// Earlier passes tried containing the logo (a rectangle sticker on a mismatched pastel) and
// then a blurred-backdrop composite (still left a visible margin); both read as tacky. Filling
// crops a logo's own built-in whitespace, which is exactly what should be cropped.
function artworkOf(e: EventListItem): string | null {
  return eventArtwork(e)[0] ?? null;
}

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

  // The KYC query and `showKycNudge` moved into KycNudgeBanner along with the nudge itself —
  // including the comment explaining why it waits on a resolved response instead of reading the
  // localStorage-seeded store. Worth reading before re-adding any KYC condition to this page.

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

      {/* KYC soft nudge — REMOVED 2026-09-10. Verification is now demanded at the point of
          opening an AGM (see the auto-open in events/[id]) rather than nudged from Home, so
          Home says nothing about KYC at all.

          Preserved, working and self-contained in KycNudgeBanner. To restore this nudge:
          uncomment the import and the line below. Nothing else.

          ⚠️ Profile's copy was removed too (2026-09-10), so KycNudgeBanner now has NO live
          consumer anywhere and nothing will catch it breaking. Check it renders before
          trusting a revert. */}
      {/* <KycNudgeBanner /> */}

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

          {/* 2s on request, same as Upcoming. Fast, but both rows pause the moment the pointer
              is over them, so a card can't slide out from under a click. */}
          {isLoading ? (
            <CarouselSkeleton />
          ) : (
            <CardCarousel label="Live now" autoPlayMs={2000}>
              {liveEvents.map((e) => (
                <LiveCard key={e.id} event={e} />
              ))}
            </CardCarousel>
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
          {/* Chip colours are the frame's: pale green / pale amber / pale blue, each with its
              icon in a darker shade of the same hue. Innovation was #f9b6ff (bright pink) and
              all three icons were the same navy-grey. The copy is ours on purpose — the frame
              repeats one placeholder line across all three tiles. */}
          <DiscoverTile
            href="/agm"
            icon={Building2}
            label="AGM"
            desc="Join shareholder meetings and vote on resolutions"
            tint="#c3e1d0"
            iconColor="#1a6b3c"
          />
          <DiscoverTile
            href="/hackathon"
            icon={Lightbulb}
            label="Innovation"
            desc="Compete in innovation challenges and build to win"
            tint="#fde9b0"
            iconColor="#a16207"
          />
          <DiscoverTile
            href="/events"
            icon={Rocket}
            label="Launch Events"
            desc="Follow product launches and live company events"
            tint="#c3d3ff"
            iconColor="#3352cc"
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
            <CardCarousel label="Upcoming events" autoPlayMs={2000}>
              {upcoming.map((e) => (
                <UpcomingCard key={e.id} event={e} />
              ))}
            </CardCarousel>
          )}
        </section>
      )}

      {/* Browse All Events banner.
          Half the column on desktop, left-aligned, per the frame — it was full-width. Stays
          full-width on mobile, where half a phone screen can't hold the copy and the button
          side by side. */}
      <Link
        href="/events"
        className="relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl px-5 py-5 text-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 md:w-1/2"
        style={{
          backgroundColor: "#0A3D2E",
          // ONE lighter wedge sweeping in from the right, bounded by a single crisp arc that
          // bulges left at mid-height. Geometry is what makes it read correctly, so the numbers
          // are deliberate rather than eyeballed:
          //
          //   at 90% 50%   — centre near the right edge, vertically centred
          //   46% wide     — so the arc crosses mid-height at 90-46 = 44% of the card
          //   58% tall     — only just over the half-height (50%), which is what bends the arc
          //                  hard. A taller radius (the earlier 190%) makes an almost vertical
          //                  edge; 58% still reaches the top and bottom edges, so the wedge has
          //                  no visible cap inside the card, but the boundary sweeps from 44%
          //                  at the middle out to ~67% at the edges.
          //
          // A hard stop, not a fade: the crisp boundary IS the effect, and a soft one reads as
          // a smudge. White at low alpha rather than a second fixed green, so it tracks the
          // base colour if the brand green is ever retuned.
          backgroundImage:
            "radial-gradient(ellipse 46% 58% at 90% 50%, rgba(255,255,255,0.085) 0 100%, rgba(255,255,255,0) 100%)",
        }}
      >
        <div className="min-w-0">
          <p className="text-base font-medium tracking-[-0.32px]">Browse All Events</p>
          <p className="text-sm tracking-[-0.14px] text-white/70">
            Hundreds of events waiting for you
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium tracking-[-0.14px] text-[#0A3D2E]">
          Explore
          <ArrowRightCircle className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

// Card header artwork, shared by both carousels.
//
// Order: the event's own flyer/banner, then the organiser's logo, then a stock HeroCard poster
// chosen by module. The poster tier replaced a tinted box with a small module icon in it, which
// is what an event with no logo used to get — a grey square with a building glyph, next to
// neighbours carrying real photography.
//
// `posterForEventType` is shared with the detail-page banner (`EventBanner`), which resolves the
// same "nothing uploaded" case the same way.
//
// The failure path is state, not a style mutation: the old handler set `display:none` on the
// broken <img>, which left a bare tint — the fallback lives in the other branch and could
// never appear. Flipping state re-renders into that branch properly.
function CardArtwork({
  event: e,
  className,
}: {
  event: EventListItem;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const art = artworkOf(e);
  const organiser = e.registerName || e.organizerName;
  const Icon = MODULE_ICON[moduleOf(e.eventType)];
  const show = art && !failed;

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ backgroundColor: tileTint(organiser || e.title) }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : !posterFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterForEventType(e.eventType)}
          alt=""
          className="h-full w-full object-cover"
          // A local file, so this should never fire — kept so a missing/renamed asset degrades
          // to the icon rather than a torn image.
          onError={() => setPosterFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon className="h-8 w-8 text-foreground/50" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}

// ── Live card ────────────────────────────────────────────────────────────────
function LiveCard({ event: e }: { event: EventListItem }) {
  return (
    <Link
      href={liveHref(e)}
      className="flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-foreground/6 bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <div className="relative">
        {/* ~2.6:1, per the frame. It was h-[168px] (1.79:1), which made the cards read
            noticeably chunkier than the design. Note the trade: `CardArtwork` uses
            object-cover, so a shorter box crops a wide organiser logo harder. */}
        <CardArtwork event={e} className="h-[130px]" />
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
  return (
    <Link
      href={hrefFor(e)}
      className="flex w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-foreground/6 bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      {/* ~2.6:1, matching LiveCard — see the note there. */}
      <CardArtwork event={e} className="h-[122px]" />
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
          {e.title}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-foreground/60">
          <Clock className="h-3.5 w-3.5" />
          {/* No year — the frame reads "8 Aug, 2:00 PM". `formatDate` appends it. */}
          {formatShortDate(e.date)}, {fmtTime(e.startTime)}
          {/* The count, per the frame's "120 Registered" — but only when the list response
              actually carries it. `!= null` on purpose: a real 0 is worth showing, whereas a
              truthiness check would hide it, and the field being absent must render nothing
              rather than "0 registered". Innovation says "Applied", matching the frame. */}
          {e.rsvpCount != null && (
            <>
              <span aria-hidden>·</span>
              <Users className="h-3.5 w-3.5" />
              {e.rsvpCount.toLocaleString()}{" "}
              {isInnovation(e.eventType) ? "Applied" : "Registered"}
            </>
          )}
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
  iconColor,
}: {
  href: string;
  icon: typeof Building2;
  label: string;
  desc: string;
  tint: string;
  /** A darker shade of `tint`, per the frame. Falls back to the old uniform grey. */
  iconColor?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-foreground/6 bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: tint }}
      >
        <Icon
          className={cn("h-5 w-5", !iconColor && "text-foreground/70")}
          style={iconColor ? { color: iconColor } : undefined}
          strokeWidth={1.75}
        />
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
            // Must track the real cards' height (108px artwork + the text block), or the page
            // visibly jumps as the query resolves.
            "h-[186px] w-[320px] shrink-0 animate-pulse rounded-xl border border-foreground/6 bg-foreground/4",
          )}
        />
      ))}
    </div>
  );
}
