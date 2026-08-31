"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, MapPin, Users, Bookmark, Share2,
  QrCode, CheckCircle2, Check, Monitor, Wifi, Vote, FileText,
  BookOpen, ShieldAlert, ChevronRight, Radio, Play, DownloadCloud, FileBox
} from "lucide-react";
import {
  useGetEvent, useRsvp, useCancelRsvp, useJoinWaitlist,
  useGetSavedEvents, useSaveEvent, useUnsaveEvent, useGetPressKit, useGetQuorum
} from "@/api/events/hooks";
import { useGetResolutions } from "@/api/agm/hooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatDate, initialsFor, fileDisplayName } from "@/lib/utils";
import { useUserStore } from "@/lib/user-store";
import { rsvpWindow } from "@/lib/rsvp";

// Backend formats are upper-case (VIRTUAL/HYBRID/IN_PERSON).
const FORMAT_LABEL: Record<string, string> = {
  VIRTUAL: "Virtual Event", HYBRID: "Hybrid Event", IN_PERSON: "In-Person Event",
};
const FORMAT_ICON: Record<string, typeof Monitor> = {
  VIRTUAL: Monitor, HYBRID: Wifi, IN_PERSON: MapPin,
};

// Resolution voting window (defaultDurationSeconds) → a short label.
function fmtWindow(s?: number): string | null {
  if (!s || s <= 0) return null;
  if (s % 60 === 0) return `${s / 60} min`;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

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
  const { data: resData } = useGetResolutions(id, undefined, event?.eventType === "AGM_EGM");
  const resolutions = resData?.data?.resolutions ?? [];

  // Quorum — AGM-only, same loosely-typed endpoint/field-guessing LiveRoom uses
  // for its in-session ballot header (the backend doesn't publish a fixed schema).
  const { data: quorumResp } = useGetQuorum(id, mod === "AGM");
  const quorum = (() => {
    const m = (quorumResp?.data ?? {}) as Record<string, unknown>;
    const pctRaw =
      m.quorumPercentage ?? m.percentage ?? m.currentPercentage ?? m.presentPercentage ?? m.attendancePercentage;
    const totalRaw = m.totalShareholders ?? m.totalEligible ?? m.eligibleCount ?? m.totalShares ?? m.totalAttendees;
    const pct = typeof pctRaw === "number" ? Math.round(pctRaw) : null;
    const total = typeof totalRaw === "number" ? totalRaw : null;
    return pct === null ? null : { pct, total };
  })();

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
      <div className="space-y-6">
        <div className="h-6 w-24 animate-pulse rounded-lg bg-foreground/[0.06]" />
        <div className="aspect-[649/301] w-full animate-pulse rounded-2xl bg-foreground/[0.06]" />
        <div className="h-4 w-full animate-pulse rounded bg-foreground/[0.06]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/[0.06]" />
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

  const color = event.organizerPrimaryColor || MODULE_COLOR[mod] || "#2563eb";
  const organiser = event.registerName || event.organizerName;
  const isLive = event.status === "LIVE";
  const isEnded = event.status === "ENDED";
  const isUpcoming = !isLive && !isEnded;
  const isVirtual = event.format === "VIRTUAL";
  const FormatIcon = FORMAT_ICON[event.format] ?? MapPin;

  function goLive() {
    if (mod === "AGM") router.push(`/agm/live?eventId=${id}`);
    else router.push(`/events/live?eventId=${id}`);
  }

  // Item A — late-RSVP window; tick every 30s
  const [rsvpTick, setRsvpTick] = useState(0);
  useEffect(() => {
    if (!event?.startTime) return;
    const iv = setInterval(() => setRsvpTick(n => n + 1), 30_000);
    return () => clearInterval(iv);
  }, [event?.startTime]);
  void rsvpTick;
  const rsvpState = event
    ? rsvpWindow({ startTime: event.startTime, lateRsvpMinutes: event.lateRsvpMinutes ?? null })
    : null;
  const rsvpClosedByCutoff = !!(rsvpState && !rsvpState.isOpen && !isEnded);
  const fill = event.maximumCapacity
    ? Math.round((event.registeredCount / event.maximumCapacity) * 100)
    : 0;
  const isFull = event.maximumCapacity > 0 && event.registeredCount >= event.maximumCapacity;

  return (
    <div className="space-y-6 pb-28">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero visual — Figma shows a live video preview (LIVE pill + play button)
          for live/ended events and a plain promo image for upcoming ones. There's
          no real event image in the API yet, so we fall back to the module/brand
          colour with a big initials watermark, same as before. */}
      {isLive ? (
        <button
          onClick={goLive}
          className="group relative block aspect-[649/301] w-full overflow-hidden rounded-2xl text-left"
          style={{ background: color }}
        >
          <div className="absolute -bottom-10 -right-8 select-none text-[160px] font-black leading-none text-white/10">
            {initialsFor(organiser)}
          </div>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-transform group-hover:scale-105">
              <Play className="h-6 w-6 fill-white" />
            </span>
          </span>
        </button>
      ) : (
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl",
            isEnded ? "aspect-[649/301]" : "aspect-[649/193]",
          )}
          style={{ background: color }}
        >
          <div className="absolute -bottom-10 -right-8 select-none text-[160px] font-black leading-none text-white/10">
            {initialsFor(organiser)}
          </div>
        </div>
      )}

      {/* Icon tile + title + actions */}
      <div className="flex gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {event.organizerLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.organizerLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            initialsFor(organiser)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
              {event.title}
            </h1>
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

          {event.registered && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs font-medium tracking-[-0.12px] text-primary">You&apos;re Confirmed</span>
            </div>
          )}

          {/* AGM's QR check-in lives in the 3-tile action grid below instead, matching Figma. */}
          {mod !== "AGM" && !isVirtual && (
            <Link
              href={`/events/qr-checkin?eventId=${id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 px-3 py-1.5 text-xs font-medium tracking-[-0.12px] text-foreground/70 transition-colors hover:bg-foreground/[0.04]"
            >
              <QrCode className="h-3.5 w-3.5" /> QR check-in
            </Link>
          )}
        </div>
      </div>

      {/* Capacity — only when the event actually has a cap */}
      {event.maximumCapacity > 0 && (
        <div className="max-w-sm">
          <div className="flex items-center justify-between text-xs tracking-[-0.12px] text-foreground/60">
            <span>{event.registeredCount.toLocaleString()} registered</span>
            <span>{event.maximumCapacity.toLocaleString()} capacity</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
          </div>
        </div>
      )}

      {/* RSVP feedback — closed / invite-only events return their message here from the backend */}
      {rsvpError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{rsvpError}</p>
        </div>
      )}

      {/* Description + tags */}
      {(event.description || (event.tags && event.tags.length > 0)) && (
        <section className="space-y-3">
          {event.description && (
            <>
              <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">About this event</h2>
              <p className="text-sm leading-relaxed tracking-[-0.14px] text-foreground/70">{event.description}</p>
            </>
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

      {/* AGM module section */}
      {mod === "AGM" && (
        <section className="space-y-4">
          {/* Quorum — mirrors the capacity bar above but keyed off the live
              shareholder-attendance endpoint rather than RSVP capacity. */}
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

          <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">AGM Actions</h2>
          {kycStatus !== "full" ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">Identity verification required to access AGM actions</p>
              </div>
              <Link href="/bvn" className="text-xs font-semibold text-amber-600 hover:underline shrink-0">Verify</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {event.agmProxyEnabled && !isVirtual && (
                <Link href={`/agm/proxy?eventId=${id}`}>
                  <ActionTile icon={<FileText className="h-5 w-5 text-foreground/70" />} label="Appoint a Proxy" />
                </Link>
              )}
              {!isLive && !isEnded && (
                <Link href={`/agm/pre-vote?eventId=${id}`}>
                  <ActionTile icon={<Vote className="h-5 w-5 text-foreground/70" />} label="Pre-AGM Voting" />
                </Link>
              )}
              {!isVirtual && (
                <Link href={`/events/qr-checkin?eventId=${id}`}>
                  <ActionTile icon={<QrCode className="h-5 w-5 text-foreground/70" />} label="QR check-in" />
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* Hackathon / Innovation module section */}
      {mod === "HACKATHON" && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">Challenge Actions</h2>
          <div className="space-y-2">
            <Link href={`/hackathon/${id}`}>
              <ActionRow
                icon={<BookOpen className="h-5 w-5 text-purple-600" />}
                label="View Challenge Brief"
                bg="bg-purple-50"
                labelColor="text-purple-800"
              />
            </Link>
            <Link href="/hackathon/my-applications">
              <ActionRow icon={<Users className="h-5 w-5 text-foreground/70" />} label="My Application" />
            </Link>
          </div>
        </section>
      )}

      {/* Launch module section */}
      {mod === "LAUNCH" && (
        <section className="space-y-3">
          {isUpcoming && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 mb-1">Launching soon</p>
              <p className="text-2xl font-bold text-orange-900 mb-0.5">
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
          <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">Audience Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Press / Media", color: "text-purple-700", bg: "bg-purple-50" },
              { label: "VIP Guests", color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Public", color: "text-foreground/70", bg: "bg-foreground/[0.04]" },
            ].map(({ label, color: c, bg }) => (
              <div key={label} className={cn("rounded-xl py-3 px-2 flex items-center justify-center text-center", bg)}>
                <span className={cn("text-xs font-semibold", c)}>{label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-900 mb-1">Press Kit</p>
            <p className="text-sm text-orange-700 leading-relaxed">
              {event.pressKitReleased
                ? "Press kit and product assets are now available for download."
                : "Press kit and product assets are released the moment the launch goes live."}
            </p>
          </div>
        </section>
      )}

      {/* Speakers / Key participants (from backend) */}
      {event.speakers && event.speakers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">
            {mod === "AGM" ? "Key Participants" : "Speakers"}
          </h2>
          <div className="space-y-2">
            {event.speakers.map((spk) => (
              <div key={spk.id} className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initialsFor(spk.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{spk.name}</p>
                  {spk.roleTitle && <p className="text-xs text-foreground/60">{spk.roleTitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resolutions & Agenda — one combined dot timeline (resolutions carry a badge) */}
      {((event.agenda && event.agenda.length > 0) || (mod === "AGM" && resolutions.length > 0)) && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">
            {mod === "AGM" ? "Resolutions & Agenda" : "Agenda"}
          </h2>
          <div className="space-y-4">
            {[...(event.agenda ?? [])]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((item) => (
                <div key={`agenda-${item.id}`} className="flex gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground/20" />
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

            {mod === "AGM" &&
              [...resolutions]
                .sort((a, b) => a.order - b.order)
                .map((r) => {
                  const v = (r.myVote || "").toUpperCase();
                  const s = (r.status || "").toUpperCase();
                  const badge = v ? (
                    <Badge variant="success">Voted {v.charAt(0) + v.slice(1).toLowerCase()}</Badge>
                  ) : s === "OPEN" ? (
                    <Badge variant="warning">Open</Badge>
                  ) : s === "CLOSED" ? (
                    <Badge variant="muted">Closed</Badge>
                  ) : s === "WAITING" ? (
                    <Badge variant="muted">Waiting</Badge>
                  ) : (
                    <Badge variant="muted">Pending</Badge>
                  );
                  return (
                    <div key={`res-${r.id}`} className="flex gap-3">
                      <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground/20" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground/90">
                            Resolution {r.order + 1}{r.specialResolution ? " · Special" : ""}: {r.title}
                          </p>
                          <div className="shrink-0">{badge}</div>
                        </div>
                        {(r.description || fmtWindow(r.defaultDurationSeconds)) && (
                          <p className="mt-0.5 text-xs text-foreground/60">
                            {[
                              r.description,
                              fmtWindow(r.defaultDurationSeconds)
                                ? `${fmtWindow(r.defaultDurationSeconds)} voting window`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </section>
      )}

      {/* Press Kit for Product Launch events */}
      {mod === "LAUNCH" && pressKit && pressKit.totalCount > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">Press Kit</h2>
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
                    "flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4",
                    !isReleased && "opacity-60",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isReleased ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-foreground/50"
                    )}>
                      <FileBox className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground" title={name}>
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
                      className="shrink-0 rounded-xl bg-foreground/[0.04] p-2 hover:bg-foreground/[0.08] transition-colors"
                      title="Download"
                    >
                      <DownloadCloud className="h-4 w-4 text-foreground" />
                    </a>
                  ) : (
                    <Badge variant="warning" className="shrink-0 uppercase text-[10px]">Embargoed</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-foreground/10 bg-white/95 backdrop-blur px-4 py-3 md:left-[259px]">
        {isLive ? (
          <Button className="w-full gap-2" size="lg" fullWidth onClick={goLive}>
            <Radio className="h-4 w-4" /> Join Live Session
          </Button>
        ) : event.waitlisted && !event.registered ? (
          <Button className="w-full" size="lg" fullWidth variant="outline" disabled>On waitlist</Button>
        ) : event.registered ? (
          <div className="flex gap-3">
            {/* AGM RSVP cannot be cancelled once LIVE or ENDED — doing so wipes
                the shareholder from the admin register and corrupts quorum data. */}
            {!(mod === "AGM" && (isLive || isEnded)) && (
              <Button className="flex-1" size="lg" variant="outline" onClick={handleCancelRsvp} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel RSVP"}
              </Button>
            )}
            {mod === "AGM" && !isLive && !isEnded && (
              <Link href={`/agm/pre-vote?eventId=${id}`} className="flex-1">
                <Button className="w-full" size="lg" fullWidth>Pre-Vote</Button>
              </Link>
            )}
            {mod === "HACKATHON" && (
              <Link href={`/hackathon/apply?challengeId=${id}`} className="flex-1">
                <Button className="w-full" size="lg" fullWidth>Apply Now</Button>
              </Link>
            )}
          </div>
        ) : isFull ? (
          <Button
            className="w-full"
            size="lg"
            fullWidth
            variant="outline"
            onClick={handleJoinWaitlist}
            disabled={joiningWaitlist}
          >
            {joiningWaitlist ? "Joining…" : "Event full — Join waitlist"}
          </Button>
        ) : (
          <div className="space-y-2">
            {rsvpState?.inLateWindow && rsvpState.isOpen && (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-center text-xs font-semibold text-amber-800">
                Late registration open — {rsvpState.minutesLeft}m left
              </div>
            )}
            <Button
              className="w-full"
              size="lg"
              fullWidth
              onClick={handleRsvp}
              disabled={rsvping || rsvpClosedByCutoff}
            >
              {rsvping
                ? "Confirming…"
                : rsvpClosedByCutoff
                  ? "Registration Closed"
                  : "Confirm Attendance"}
            </Button>
            {rsvpClosedByCutoff && rsvpState && (
              <p className="text-center text-xs text-foreground/60">
                Registration closed at{" "}
                {rsvpState.closesAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                Contact your registrar to attend.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Equal-width icon-over-label tile — Figma's AGM action grid (Appoint a Proxy /
// Pre-AGM Voting / QR check-in), as opposed to ActionRow's list treatment used
// by the other modules.
function ActionTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-2 py-3.5 text-center transition-colors hover:bg-foreground/[0.04]">
      {icon}
      <span className="text-xs font-medium leading-tight text-foreground">{label}</span>
    </div>
  );
}

function ActionRow({
  icon, label, bg = "bg-foreground/[0.02]", labelColor = "text-foreground",
}: {
  icon: React.ReactNode; label: string; bg?: string; labelColor?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-xl border border-foreground/[0.06] px-4 py-3.5 hover:bg-foreground/[0.04] transition-colors cursor-pointer", bg)}>
      <div className="flex items-center gap-3">
        {icon}
        <span className={cn("text-sm font-medium", labelColor)}>{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-foreground/40" />
    </div>
  );
}
