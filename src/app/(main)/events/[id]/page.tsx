"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, MapPin, Users, Bookmark, Share2,
  QrCode, CheckCircle2, Check, Monitor, Wifi, Vote, FileText,
  BookOpen, ShieldAlert, ChevronRight, ChevronDown, Radio, Play, DownloadCloud, FileBox,
} from "lucide-react";
import {
  useGetEvent, useRsvp, useCancelRsvp, useJoinWaitlist,
  useGetSavedEvents, useSaveEvent, useUnsaveEvent, useGetPressKit, useGetQuorum,
} from "@/api/events/hooks";
import { useGetResolutions, useSubmitQuestion, useCastVote } from "@/api/agm/hooks";
import { useGetMyTeam } from "@/api/hackathon/hooks";
import { PreVoteSheet } from "@/components/attend/PreVoteSheet";
import { ProxySheet } from "@/components/attend/ProxySheet";
import { VoteButtons, type VoteChoice } from "@/components/attend/VoteButtons";
import type { AgendaItemDetail, Resolution, SpeakerItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate, initialsFor, fileDisplayName, parseApiDate } from "@/lib/utils";
import { useEffect } from "react";
import {
  getRsvpEligibility,
  rsvpBlockedMessage,
  parseEventStart,
  formatWindowTime,
} from "@/lib/rsvp";
import { useUserStore } from "@/lib/user-store";

// Laid out to Figma's event-detail frame; OUR logic is preserved wholesale (every hook,
// RSVP/waitlist/cancel handler, KYC gate, module switching, resolutions, press-kit, and
// the CTA state machine). Structure per Figma: a plain banner hero (no text inside it),
// then organiser tile + title + save/share, a single meta line, the module's action row,
// "Details", and the CTA at the end of the column. AGMs additionally get the right-hand
// Agenda / Q&A / Resolution panel. The hero keeps the brand colour because it's real
// backend data (brandPrimary / branding / MODULE_COLOR) standing in for the promo image
// the API doesn't serve.

// Backend formats are upper-case (VIRTUAL/HYBRID/IN_PERSON).
const FORMAT_LABEL: Record<string, string> = {
  VIRTUAL: "Virtual Event", HYBRID: "Hybrid Event", IN_PERSON: "In-Person Event",
};
const FORMAT_ICON: Record<string, typeof Monitor> = {
  VIRTUAL: Monitor, HYBRID: Wifi, IN_PERSON: MapPin,
};

// Map backend eventType → the module groupings the detail UI switches on.
function moduleOf(eventType: string): "AGM" | "HACKATHON" | "LAUNCH" | "GENERAL" {
  if (eventType === "AGM_EGM") return "AGM";
  if (eventType === "HACKATHON" || eventType === "INNOVATION_CHALLENGE") return "HACKATHON";
  if (eventType === "PRODUCT_LAUNCH") return "LAUNCH";
  return "GENERAL";
}

// Hero/accent colour per module — used when the organiser hasn't set a brand colour,
// so a launch reads orange, an AGM green, etc. (instead of a generic blue).
const MODULE_COLOR: Record<string, string> = {
  AGM: "#1a6b3c",
  HACKATHON: "#7c22c9",
  LAUNCH: "#ea6c00",
  GENERAL: "#2563eb",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { kycStatus } = useUserStore();

  const { data, isLoading, error } = useGetEvent(id);
  const event = data?.data;

  const [rsvpError, setRsvpError] = useState<string | null>(null);
  // Pre-voting opens as a sheet over this page (Figma's frame shows the detail page
  // dimmed behind it), rather than navigating away to /agm/pre-vote.
  const [preVoteOpen, setPreVoteOpen] = useState(false);
  const [proxyOpen, setProxyOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const startsAt = event ? parseEventStart(event.date, event.startTime) : null;

  // Late registration: a LIVE event keeps accepting RSVPs for LATE_RSVP_MINUTES past its
  // start, per the PM decision. Everything else is decided by status and rsvpEnabled rather
  // than by the clock, so an event still PUBLISHED after its nominal start keeps accepting
  // registrations — which is what the backend does, and what the old clock-only gate wrongly
  // blocked. See docs/RSVP_LATE_REGISTRATION.md.
  const rsvpEligibility = getRsvpEligibility(event);
  const rsvpBlocked = rsvpBlockedMessage(rsvpEligibility.reason);
  const lateWindow = rsvpEligibility.lateWindowClosesAt;

  const [shared, setShared] = useState(false);
  const { mutate: rsvp, isPending: rsvping } = useRsvp(id);
  const { mutate: cancelRsvp, isPending: cancelling } = useCancelRsvp(id);
  const { mutate: joinWaitlist, isPending: joiningWaitlist } = useJoinWaitlist(id);

  const { data: savedResp } = useGetSavedEvents();
  const { mutate: saveEvent } = useSaveEvent(id);
  const { mutate: unsaveEvent } = useUnsaveEvent(id);
  const saved = !!savedResp?.data?.events?.some((e) => e.id === id);

  const mod = event ? moduleOf(event.eventType) : "GENERAL";
  const { data: pressKitResp } = useGetPressKit(id, undefined, mod === "LAUNCH");
  const pressKit = pressKitResp?.data;

  // Resolutions are a separate array from the agenda — only AGMs have them.
  // Poll while live so the panel's resolution status and countdown stay current
  // (same 5s cadence LiveRoom's ballot uses); no polling otherwise.
  const { data: resData } = useGetResolutions(
    id,
    event?.status === "LIVE" ? 5000 : undefined,
    event?.eventType === "AGM_EGM",
  );
  const resolutions = resData?.data?.resolutions ?? [];
  // Same signal agm/proxy/page.tsx uses to decide whether a proxy already exists — so the
  // entry point into that page can say "Change proxy" instead of promising a fresh
  // appointment it won't actually offer once you get there.
  const hasProxy = resData?.data?.hasProxy === true;

  // Quorum — AGM-only and live-only, same loosely-typed endpoint LiveRoom reads for its
  // in-session ballot header (the backend publishes no fixed schema for it).
  const { data: quorumResp } = useGetQuorum(id, mod === "AGM" && event?.status === "LIVE");
  const quorum = (() => {
    const m = (quorumResp?.data ?? {}) as Record<string, unknown>;
    const pctRaw =
      m.quorumPercentage ?? m.percentage ?? m.currentPercentage ?? m.presentPercentage ?? m.attendancePercentage;
    const totalRaw = m.totalShareholders ?? m.totalEligible ?? m.eligibleCount ?? m.totalShares ?? m.totalAttendees;
    const pct = typeof pctRaw === "number" ? Math.round(pctRaw) : null;
    const total = typeof totalRaw === "number" ? totalRaw : null;
    return pct === null ? null : { pct, total };
  })();

  // Only meaningful for HACKATHON — useGetMyTeam no-ops (enabled: !!challengeId) otherwise.
  const { data: myTeamResp } = useGetMyTeam(mod === "HACKATHON" ? id : "");
  const teamSubmissionStatus = myTeamResp?.data?.submission?.status;
  const submitted = !!teamSubmissionStatus && teamSubmissionStatus !== "NOT_SUBMITTED";

  function toggleSave() {
    if (saved) unsaveEvent();
    else saveEvent();
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: event?.title ?? "Event", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  function handleRsvp() {
    setRsvpError(null);
    rsvp(undefined, {
      onError: (err: any) =>
        setRsvpError(err?.response?.data?.message || err?.message || "RSVP failed. Please try again."),
    });
  }

  function handleJoinWaitlist() {
    setRsvpError(null);
    joinWaitlist(undefined, {
      onError: (err: any) =>
        setRsvpError(err?.response?.data?.message || err?.message || "Could not join the waitlist."),
    });
  }

  function handleCancelRsvp() {
    setRsvpError(null);
    cancelRsvp(undefined, {
      onError: (err: any) =>
        setRsvpError(err?.response?.data?.message || err?.message || "Could not cancel RSVP."),
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 animate-pulse rounded-lg bg-foreground/[0.04]" />
        <div className="h-64 animate-pulse rounded-2xl bg-foreground/[0.04]" />
        <div className="h-4 w-full animate-pulse rounded bg-foreground/[0.04]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/[0.04]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-foreground/60">Could not load event details.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const color = event.brandPrimary || event.branding?.brandColor || event.organizerPrimaryColor || MODULE_COLOR[mod] || "#0B5CFF";
  const organiser = event.registerName || event.organizerName;
  // `registered` means "eligible" for an AGM shareholder (register membership), not
  // necessarily an actual RSVP — that's what broke Cancel RSVP/Appoint Proxy for someone
  // who was only added to the register. `hasRsvped` is the real signal; fall back to
  // `registered` only while backend hasn't deployed that field yet, so this doesn't regress
  // already-registered users into seeing the RSVP button again in the meantime.
  const hasRsvped = event.hasRsvped ?? event.registered;
  const isLive = event.status === "LIVE";
  const isEnded = event.status === "ENDED";
  const isUpcoming = !isLive && !isEnded;
  const isVirtual = event.format === "VIRTUAL";
  // A VIRTUAL/HYBRID event can now be LIVE with no join link yet — Zoom links are no
  // longer minted at creation time. Show an unavailable state rather than a dead button.
  const needsStreamLink = event.format === "VIRTUAL" || event.format === "HYBRID";
  // AGMs keep the in-app live room — the live ballot, quorum and proxy voting only exist
  // there and have no equivalent on Zoom/YouTube. Every other module goes straight to the
  // organiser's stream, so for those the link itself is what "Join Live" depends on.
  const externalLive = mod !== "AGM";
  const missingStreamLink = externalLive
    ? !event.streamUrl
    : needsStreamLink && !event.streamUrl;

  function joinLive() {
    if (!externalLive) {
      router.push(`/agm/live?eventId=${id}`);
      return;
    }
    if (event?.streamUrl) {
      window.open(event.streamUrl, "_blank", "noopener,noreferrer");
    }
  }
  const FormatIcon = FORMAT_ICON[event.format] ?? MapPin;
  const fill = event.maximumCapacity
    ? Math.round((event.registeredCount / event.maximumCapacity) * 100)
    : 0;
  const isFull = event.maximumCapacity > 0 && event.registeredCount >= event.maximumCapacity;

  return (
    <div
      className={cn("flex flex-col gap-6 pb-10", mod === "HACKATHON" && "challenge-scope")}
      style={
        mod === "HACKATHON"
          ? ({
              "--brand-primary": event.brandPrimary || "#9333ea",
              "--brand-accent": event.brandAccent || "#c084fc",
            } as React.CSSProperties)
          : undefined
      }
    >
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Figma's AGM detail is two-column on desktop: the event itself on the left and a
          persistent Agenda / Q&A / Resolution panel on the right. Only AGMs get the panel
          (it's the only module with resolutions + a live ballot); every other module keeps
          the single-column layout it already had. */}
      <div
        className={cn(
          "flex flex-col gap-6",
          mod === "AGM" && "lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8",
        )}
      >
        <div className="flex min-w-0 flex-col gap-6">

      {/* Hero — Figma's detail hero is a *plain* banner: no title, chips, badges or
          controls sit inside it. Those all live below it on the page background. The
          brand colour + organiser watermark stands in for the promo image the backend
          doesn't serve. Live turns it into a video preview with a play control. */}
      <header
        className={cn(
          "relative overflow-hidden rounded-2xl",
          isLive || isEnded ? "aspect-[649/301]" : "aspect-[649/193]",
        )}
        style={{ background: color }}
      >
        <div className="absolute -bottom-10 -right-8 select-none text-[160px] font-black leading-none text-white/10">
          {initialsFor(organiser)}
        </div>
        {isLive && (
          <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
          </span>
        )}
        {/* The play control is only real when the session can actually be joined. */}
        {isLive && hasRsvped && !missingStreamLink && (
          <button
            onClick={joinLive}
            aria-label="Join live session"
            className="group absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform group-hover:scale-105">
              <Play className="h-6 w-6 fill-white text-white" />
            </span>
          </button>
        )}
      </header>

      {/* Title block — the frame runs the title flush with the hero's left edge (no
          organiser tile), then the meta line that replaces the old bordered
          "details" card (date/time, registered, format, venue). */}
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">{event.title}</h1>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={toggleSave}
                title={saved ? "Remove from saved" : "Save event"}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
              >
                <Bookmark className={cn("h-[18px] w-[18px]", saved && "fill-foreground text-foreground")} />
              </button>
              <button
                onClick={handleShare}
                title={shared ? "Link copied!" : "Share event"}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
              >
                {shared ? <Check className="h-[18px] w-[18px]" /> : <Share2 className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          <p className="mt-1 flex items-center gap-1 text-xs tracking-[-0.12px] text-foreground/60">
            <span>By:</span>
            <span className="text-foreground/80">{organiser}</span>
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs tracking-[-0.12px] text-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(event.date)}{event.startTime ? `, ${event.startTime}` : ""}
            </span>
            {event.registeredCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {event.registeredCount.toLocaleString()} Registered
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <FormatIcon className="h-3.5 w-3.5" />
              {FORMAT_LABEL[event.format] ?? event.format}
            </span>
            {event.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {event.venue}
              </span>
            )}
          </div>

          {hasRsvped && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs font-medium tracking-[-0.12px] text-primary">You&apos;re Confirmed</span>
            </div>
          )}

          {/* AGM's QR check-in lives in the action-tile grid below instead, matching Figma. */}
          {mod !== "AGM" && !isVirtual && (
            <Link
              href={`/qr-checkin?eventId=${id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 px-3 py-1.5 text-xs font-medium tracking-[-0.12px] text-foreground/70 transition-colors hover:bg-foreground/[0.04]"
            >
              <QrCode className="h-3.5 w-3.5" /> QR check-in
            </Link>
          )}
        </div>
      </div>

      {/* Capacity — the slim bar replaces the old card's capacity row */}
      {event.maximumCapacity > 0 && (
        <div className="max-w-sm">
          <div className="flex items-center justify-between text-xs tracking-[-0.12px] text-foreground/60">
            <span>{event.registeredCount.toLocaleString()} registered</span>
            <span>{event.maximumCapacity.toLocaleString()} capacity</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full" style={{ width: `${fill}%`, backgroundColor: color }} />
          </div>
        </div>
      )}

      {/* RSVP feedback — closed / invite-only events return their message here from the backend */}
      {rsvpError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">{rsvpError}</p>
        </div>
      )}

      {/* Event flyer — shown full and uncropped here in the body. The list cards crop the
          flyer to fill their header (object-cover); this view uses object-contain + a capped
          height so the whole poster stays visible whatever its aspect ratio. */}
      {(event.flyerUrl || event.bannerUrl) && (
        <section className="overflow-hidden rounded-xl border border-foreground/[0.06] bg-foreground/[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.flyerUrl || event.bannerUrl || undefined}
            alt={`${event.title} flyer`}
            className="mx-auto max-h-[520px] w-full object-contain"
            onError={(e) => {
              const sec = (e.currentTarget as HTMLImageElement).closest("section");
              if (sec) (sec as HTMLElement).style.display = "none";
            }}
          />
        </section>
      )}

      {/* AGM module section — Figma renders these as an equal-width icon-over-label tile
          row (not the list rows the other modules use), with the live quorum bar above. */}
      {mod === "AGM" && !isEnded && (
        <section className="flex flex-col gap-3">
          {quorum && (
            <div className="max-w-sm">
              <div className="flex items-center justify-between text-xs tracking-[-0.12px] text-foreground/60">
                <span>Quorum ({quorum.pct}%)</span>
                {quorum.total !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {quorum.total.toLocaleString()} Shareholders
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${quorum.pct}%` }} />
              </div>
            </div>
          )}

          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">AGM Actions</h2>
          {kycStatus !== "full" ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">Identity verification required to access AGM actions</p>
              </div>
              <Link href="/bvn" className="shrink-0 text-xs font-semibold text-amber-600 hover:underline">Verify</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {event.agmProxyEnabled && (
                <button type="button" onClick={() => setProxyOpen(true)} className="text-left">
                  <ActionTile
                    icon={<FileText className="h-5 w-5" style={{ color }} />}
                    label={hasProxy ? "Change Proxy" : "Appoint a Proxy"}
                  />
                </button>
              )}
              {/* Pre-voting closes once the meeting is live — live votes are cast in the
                  meeting room's ballot instead. */}
              {!isLive && (
                <button type="button" onClick={() => setPreVoteOpen(true)} className="text-left">
                  <ActionTile icon={<Vote className="h-5 w-5" style={{ color }} />} label="Pre-AGM Voting" />
                </button>
              )}
              {!isVirtual && (
                <Link href={`/qr-checkin?eventId=${id}`}>
                  <ActionTile icon={<QrCode className="h-5 w-5" style={{ color }} />} label="QR check-in" />
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* Details — Figma puts the blurb under a "Details" heading, after the action row. */}
      {(event.description || (event.tags && event.tags.length > 0)) && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">Details</h2>
          {event.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed tracking-[-0.14px] text-foreground/70">
              {event.description}
            </p>
          )}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((t) => (
                <Badge key={t} variant="muted">{t}</Badge>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Hackathon / Innovation module section */}
      {mod === "HACKATHON" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">Challenge Actions</h2>
          <div className="flex flex-col gap-2">
            <Link href={`/hackathon/${id}`}>
              <ActionRow
                icon={<BookOpen className="h-5 w-5 text-(--brand-primary)" />}
                label="View Challenge Brief"
                bg="bg-(--brand-primary)/10"
                labelColor="text-(--brand-primary)"
                style={{
                  backgroundColor: `${event.brandPrimary || '#9333ea'}15`,
                  color: 'var(--brand-primary)',
                }}
              />
            </Link>
            <Link href="/hackathon/my-applications">
              <ActionRow icon={<Users className="h-5 w-5" style={{ color }} />} label="My Application" />
            </Link>
          </div>
        </section>
      )}

      {/* Launch module section */}
      {mod === "LAUNCH" && (
        <section className="flex flex-col gap-3">
          {isUpcoming && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">Launching soon</p>
              <p className="mb-0.5 text-2xl font-bold text-orange-900">
                {(() => {
                  const d = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
                  return d > 0 ? `${d} day${d !== 1 ? "s" : ""} to go` : "Launching today!";
                })()}
              </p>
              <p className="text-sm text-orange-700">
                {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                {event.startTime ? ` at ${event.startTime}` : ""}
              </p>
            </div>
          )}
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">Audience Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Press / Media", color: "text-purple-700", bg: "bg-purple-50" },
              { label: "VIP Guests", color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Public", color: "text-gray-700", bg: "bg-gray-100" },
            ].map(({ label, color: c, bg }) => (
              <div key={label} className={cn("flex items-center justify-center rounded-xl px-2 py-3 text-center", bg)}>
                <span className={cn("text-xs font-semibold", c)}>{label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="mb-1 text-sm font-semibold text-orange-900">Press Kit</p>
            <p className="text-sm leading-relaxed text-orange-700">
              {event.pressKitReleased
                ? "Press kit and product assets are now available for download."
                : "Press kit and product assets are released the moment the launch goes live."}
            </p>
          </div>
        </section>
      )}

      {/* Speakers / Key participants (from backend) */}
      {event.speakers && event.speakers.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">
            {mod === "AGM" ? "Key Participants" : "Speakers"}
          </h2>
          <div className="flex flex-col gap-2">
            {event.speakers.map((spk) => (
              <div key={spk.id} className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white px-4 py-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initialsFor(spk.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{spk.name}</p>
                  {spk.roleTitle && <p className="text-xs text-foreground/60">{spk.roleTitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Agenda — non-AGM modules only. AGMs render agenda AND resolutions in the
          right-hand Agenda / Q&A / Resolution panel instead (Figma's AGM layout). */}
      {mod !== "AGM" && event.agenda && event.agenda.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">Agenda</h2>
          <div className="flex flex-col gap-4">
            {[...event.agenda]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((item) => (
                <div key={`agenda-${item.id}`} className="flex gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-sm text-foreground/90">{item.title}</p>
                    <p className="text-xs text-foreground/60">
                      {[item.time, item.durationMinutes ? `${item.durationMinutes} min` : null, item.speaker]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              ))}

          </div>
        </section>
      )}

      {/* Press Kit for Product Launch events */}
      {mod === "LAUNCH" && pressKit && pressKit.totalCount > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">Press Kit</h2>
            <Badge variant="muted">{pressKit.releasedCount} / {pressKit.totalCount} released</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pressKit.files.map((file) => {
              const isReleased = file.status === "RELEASED";
              const name = fileDisplayName(file);
              return (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]",
                    !isReleased && "opacity-60",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
                      isReleased ? "bg-primary/10 text-primary" : "bg-foreground/[0.04] text-foreground/60"
                    )}>
                      <FileBox className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground" title={name}>
                        {name}
                      </p>
                      <p className="text-xs text-foreground/60">{file.sizeLabel}</p>
                    </div>
                  </div>
                  {isReleased ? (
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-[10px] bg-foreground/[0.04] p-2 transition-colors hover:bg-foreground/[0.08]"
                      title="Download"
                    >
                      <DownloadCloud className="h-4 w-4 text-foreground" />
                    </a>
                  ) : (
                    <Badge variant="warning" className="shrink-0 text-[10px] uppercase">Embargoed</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Guest access code entry — REMOVED: authenticated users should not see guest entry */}

        </div>

        {mod === "AGM" && (
          <AgmSidePanel
            eventId={id}
            speakers={event.speakers ?? []}
            agenda={event.agenda ?? []}
            resolutions={resolutions}
            isLive={isLive}
            canJoinLive={isLive && hasRsvped && !missingStreamLink}
            onJoinLive={() => router.push(`/agm/live?eventId=${id}`)}
          />
        )}

      {/* Primary CTA — Figma sits it at the end of the content column, full width of that
          column. (It used to be a viewport-wide fixed bar pinned over the whole app.) It is
          a grid sibling rather than a child of the column so that it stays under the content
          on desktop but falls below the side panel on mobile, as the mobile frame shows. */}
      <div className="pt-1 lg:col-start-1">
        {isLive && hasRsvped ? (
          missingStreamLink ? (
            <Button className="w-full gap-2" variant="outline" disabled>
              <Radio className="h-4 w-4" /> Join link not available yet
            </Button>
          ) : (
            <Button
              className="w-full gap-2"
              style={{ backgroundColor: color }}
              onClick={joinLive}
            >
              <Radio className="h-4 w-4" /> Join Live Session →
            </Button>
          )
        ) : isLive && !hasRsvped ? (
          rsvpEligibility.allowed ? (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                <Clock className="h-4 w-4 shrink-0 animate-pulse" />
                Late registration open
                {lateWindow && ` — closes ${formatWindowTime(lateWindow)}`}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleRsvp}
                  disabled={rsvping}
                  style={{ backgroundColor: color }}
                >
                  {rsvping ? "Confirming…" : "RSVP & Join"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {rsvpBlocked}
                {startsAt && ` It started at ${formatWindowTime(startsAt)}.`}
                <span className="mt-0.5 block font-medium">
                  Contact the organiser if you were expecting access.
                </span>
              </span>
            </div>
          )
        ) : event.waitlisted && !hasRsvped ? (
          <Button className="w-full" variant="outline" disabled>On waitlist</Button>
        ) : hasRsvped ? (
          <div className="flex gap-3">
            {/* AGM RSVP cannot be cancelled once LIVE or ENDED — doing so wipes
                the shareholder from the admin register and corrupts quorum data. */}
            {!(mod === "AGM" && (isLive || isEnded)) && (
              <Button className="flex-1" variant="outline" onClick={handleCancelRsvp} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel RSVP"}
              </Button>
            )}
            {mod === "AGM" && !isLive && !isEnded && (
              <Button
                className="flex-1"
                style={{ backgroundColor: color }}
                onClick={() => setPreVoteOpen(true)}
              >
                Pre-Vote
              </Button>
            )}
            {mod === "HACKATHON" && (
              <Link
                href={submitted ? "/hackathon/my-applications" : `/hackathon/apply?challengeId=${id}`}
                className="flex-1"
              >
                <Button className="w-full" style={{ backgroundColor: color }}>
                  {submitted ? "View Application" : "Apply Now"}
                </Button>
              </Link>
            )}
          </div>
        ) : isFull ? (
          <Button
            className="w-full"
            variant="outline"
            onClick={handleJoinWaitlist}
            disabled={joiningWaitlist}
          >
            {joiningWaitlist ? "Joining…" : "Event full — Join waitlist"}
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {rsvpBlocked && (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {rsvpBlocked}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleRsvp}
                disabled={rsvping || !rsvpEligibility.allowed}
                style={{ backgroundColor: color }}
              >
                {rsvping ? "Confirming…" : "Confirm Attendance (RSVP)"}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Mounted only while open, so its resolution/proxy queries don't run until needed. */}
      {preVoteOpen && (
        <PreVoteSheet eventId={id} open onClose={() => setPreVoteOpen(false)} />
      )}
      {proxyOpen && (
        <ProxySheet eventId={id} open onClose={() => setProxyOpen(false)} />
      )}
    </div>
  );
}

// Figma's AGM action row — equal-width icon-over-label tiles, as opposed to ActionRow's
// list treatment which the other modules keep.
function ActionTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-foreground/[0.06] bg-white px-2 py-3.5 text-center transition-colors hover:bg-foreground/[0.02]">
      {icon}
      <span className="text-xs font-medium leading-tight tracking-[-0.12px] text-foreground">{label}</span>
    </div>
  );
}

// The persistent right-hand panel on Figma's AGM detail layout. Q&A has no pre-session
// endpoint (questions only exist inside the live room's websocket session), so that tab
// points into the meeting rather than inventing an inbox the backend doesn't serve.
function AgmSidePanel({
  eventId, speakers, agenda, resolutions, isLive, canJoinLive, onJoinLive,
}: {
  eventId: string;
  speakers: SpeakerItem[];
  agenda: AgendaItemDetail[];
  resolutions: Resolution[];
  isLive: boolean;
  canJoinLive: boolean;
  onJoinLive: () => void;
}) {
  const [tab, setTab] = useState<"agenda" | "qa" | "resolution">("agenda");
  // Q&A composer — POST /participant/events/{id}/questions. Submission works outside
  // the live room; only the real-time question *feed* is websocket-bound (that stays
  // in LiveRoom), so the panel offers the composer plus a way into the session.
  const [question, setQuestion] = useState("");
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaSent, setQaSent] = useState(false);
  const { mutate: submitQuestion, isPending: submittingQuestion } = useSubmitQuestion(eventId);

  // Live voting from the panel. Choices are staged locally and committed by "Send",
  // matching Figma (one Send for the whole list, not per resolution).
  const [pendingVotes, setPendingVotes] = useState<Record<string, VoteChoice>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSent, setVoteSent] = useState(false);
  const { mutateAsync: castVote, isPending: castingVote } = useCastVote(eventId);

  const sortedResolutions = [...resolutions].sort((a, b) => a.order - b.order);
  // The resolution currently accepting votes — same status test LiveRoom uses.
  const openRes = sortedResolutions.find(
    (r) => (r.status || "").toUpperCase() === "OPEN" || r.secondsRemaining > 0,
  );

  // Re-sync to the open resolution's secondsRemaining on each poll, tick down locally
  // in between (identical to LiveRoom's countdown).
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (!openRes) {
      setCountdown(0);
      return;
    }
    setCountdown(openRes.secondsRemaining);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRes?.id, openRes?.secondsRemaining]);

  async function sendVotes() {
    const entries = Object.entries(pendingVotes);
    if (entries.length === 0) {
      setVoteError("Choose For, Against or Abstain before sending.");
      return;
    }
    setVoteError(null);
    setVoteSent(false);
    try {
      for (const [resolutionId, choice] of entries) {
        await castVote({ resolutionId, data: { choice } });
      }
      setPendingVotes({});
      setVoteSent(true);
    } catch (err: any) {
      const status = err?.response?.status;
      setVoteError(
        err?.response?.data?.message ||
          (status === 409
            ? "Your proxy has already voted on your behalf for this resolution."
            : err?.message || "Couldn't record your vote. Please try again."),
      );
    }
  }

  const TABS = [
    { key: "agenda" as const, label: "Agenda" },
    { key: "qa" as const, label: "Q&A" },
    { key: "resolution" as const, label: "Resolution" },
  ];

  return (
    // The frame separates the panel from the content with a rule running the full
    // height of the row, so the aside stretches rather than hugging its content.
    <aside className="flex flex-col gap-3 lg:border-l lg:border-foreground/10 lg:pl-8">
      <div className="flex gap-1 border-b border-foreground/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 border-b-2 px-3 py-2 text-sm tracking-[-0.14px] transition-colors",
              tab === t.key
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "agenda" && (
        <>
          {speakers.length > 0 && (
            <PanelCard title="Speakers">
              <div className="flex flex-col">
                {speakers.map((spk, i) => (
                  <div
                    key={spk.id}
                    className={cn("py-2.5", i > 0 && "border-t border-foreground/[0.06]")}
                  >
                    <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{spk.name}</p>
                    {spk.roleTitle && <p className="text-xs text-foreground/60">{spk.roleTitle}</p>}
                  </div>
                ))}
              </div>
            </PanelCard>
          )}
          {agenda.length > 0 ? (
            <PanelCard title="Agenda">
              <ol className="flex flex-col">
                {[...agenda]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((item, i) => (
                    <li
                      key={item.id}
                      className={cn("flex gap-2 py-2.5", i > 0 && "border-t border-foreground/[0.06]")}
                    >
                      <span className="text-sm text-foreground/60">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-sm tracking-[-0.14px] text-foreground">{item.title}</p>
                        {(item.time || item.durationMinutes || item.speaker) && (
                          <p className="text-xs text-foreground/60">
                            {[item.time, item.durationMinutes ? `${item.durationMinutes} min` : null, item.speaker]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
              </ol>
            </PanelCard>
          ) : (
            speakers.length === 0 && <PanelEmpty>The organiser hasn&apos;t published an agenda yet.</PanelEmpty>
          )}
        </>
      )}

      {tab === "qa" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm tracking-[-0.14px] text-foreground/60">
            Questions are reviewed by the moderator before being shown to the Chair
          </p>
          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setQaError(null);
              setQaSent(false);
            }}
            rows={4}
            placeholder="Type your question"
            className="w-full rounded-xl border border-transparent bg-foreground/[0.04] p-3.5 text-sm tracking-[-0.14px] text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:bg-white"
          />
          {qaError && <p className="text-xs text-red-600">{qaError}</p>}
          {qaSent && (
            <p className="text-xs text-primary">
              Sent — the moderator will review it before it reaches the Chair.
            </p>
          )}
          <Button
            size="lg"
            fullWidth
            loading={submittingQuestion}
            disabled={!question.trim() || submittingQuestion}
            onClick={() =>
              submitQuestion(
                { content: question.trim(), anonymous: false },
                {
                  onSuccess: () => {
                    setQuestion("");
                    setQaSent(true);
                  },
                  onError: (err: any) =>
                    setQaError(
                      err?.response?.data?.message ||
                        err?.message ||
                        "Couldn't send your question. Please try again.",
                    ),
                },
              )
            }
          >
            Send
          </Button>
          {canJoinLive && (
            <Button size="sm" variant="outline" onClick={onJoinLive} className="w-full">
              <Radio className="h-4 w-4" /> Join live session
            </Button>
          )}
        </div>
      )}

      {tab === "resolution" && (
        <div className="flex flex-col gap-3">
          {/* Countdown — same source LiveRoom uses: re-sync to the open resolution's
              secondsRemaining on each poll and tick down locally in between. */}
          {openRes && countdown > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium tracking-[-0.14px] text-foreground">Voting open</p>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                <Clock className="h-3.5 w-3.5" />
                {fmtRemaining(countdown)} Remaining
              </span>
            </div>
          )}

          {sortedResolutions.length === 0 ? (
            <PanelEmpty>No resolutions have been published for this AGM.</PanelEmpty>
          ) : (
            sortedResolutions.map((r, i) => {
              const status = (r.status || "").toUpperCase();
              const isClosed = status === "CLOSED";
              const isOpenNow = status === "OPEN" || r.secondsRemaining > 0;
              const votedChoice = (r.myVote || "").toUpperCase() as VoteChoice | "";
              return (
                <ResolutionPanelCard
                  key={r.id}
                  /* 1-based by position, not r.order — order isn't reliably 0-based on
                     the backend (same fix already applied in LiveRoom.tsx). */
                  number={i + 1}
                  resolution={r}
                  status={status}
                  isClosed={isClosed}
                  isOpenNow={isOpenNow}
                  selected={pendingVotes[r.id] ?? (votedChoice || null)}
                  onSelect={(choice) => {
                    setVoteError(null);
                    setPendingVotes((v) => ({ ...v, [r.id]: choice }));
                  }}
                  disabled={castingVote}
                />
              );
            })
          )}

          {voteError && <p className="text-xs text-red-600">{voteError}</p>}
          {voteSent && <p className="text-xs text-primary">Your vote has been recorded.</p>}

          {sortedResolutions.length > 0 && (
            <Button
              size="lg"
              fullWidth
              loading={castingVote}
              disabled={castingVote}
              onClick={sendVotes}
            >
              Send
            </Button>
          )}
        </div>
      )}

    </aside>
  );
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-white px-4 py-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium tracking-[-0.14px] text-foreground/70">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-foreground/40 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && <div className="mt-1">{children}</div>}
    </section>
  );
}

// "1:59m" / "45s" — the shape Figma's countdown pill uses.
function fmtRemaining(total: number) {
  if (total >= 60) return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}m`;
  return `${total}s`;
}

// One resolution in the live panel: number + status badge + collapse control, the
// question, and the vote control when it is actually open. A CLOSED resolution shows
// no buttons — Figma's closed frame is title-only.
function ResolutionPanelCard({
  number, resolution: r, status, isClosed, isOpenNow, selected, onSelect, disabled,
}: {
  number: number;
  resolution: Resolution;
  status: string;
  isClosed: boolean;
  isOpenNow: boolean;
  selected: VoteChoice | null;
  onSelect: (c: VoteChoice) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <article className="rounded-xl border border-foreground/[0.06] bg-white p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm tracking-[-0.14px] text-foreground/70">
            Resolution {number}{r.specialResolution ? " · Special" : ""}
          </span>
          {isOpenNow && !isClosed && <Badge variant="success">Open</Badge>}
          {isClosed && <Badge variant="muted">Closed</Badge>}
          {r.myVote && <Badge variant="muted">Voted</Badge>}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground/40 transition-transform",
            !expanded && "-rotate-90",
          )}
        />
      </button>

      {expanded && (
        <>
          <h3 className="mt-2 text-sm tracking-[-0.14px] text-foreground">{r.title}</h3>
          {r.description && <p className="mt-1 text-xs text-foreground/60">{r.description}</p>}
          {isClosed ? null : isOpenNow ? (
            <div className="mt-3">
              <VoteButtons selected={selected} onSelect={onSelect} disabled={disabled} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-foreground/50">
              {status === "WAITING"
                ? "Voting opens when the Chair puts this resolution to the meeting."
                : "Not open for voting."}
            </p>
          )}
        </>
      )}
    </article>
  );
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-foreground/50">
      {children}
    </div>
  );
}

function ActionRow({
  icon, label, bg = "bg-white", labelColor = "text-foreground", style,
}: {
  icon: React.ReactNode; label: string; bg?: string; labelColor?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("flex items-center justify-between rounded-xl border border-foreground/[0.06] px-4 py-3.5 transition-colors hover:bg-foreground/[0.06] cursor-pointer", bg)}
      style={style}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className={cn("text-sm font-medium tracking-[-0.14px]", labelColor)}>{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-foreground/40" />
    </div>
  );
}
