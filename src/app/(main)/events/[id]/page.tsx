"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Clock, MapPin, Users, Bookmark, Share2,
  QrCode, CheckCircle2, Check, Monitor, Wifi, Vote, FileText,
  BookOpen, ShieldAlert, ChevronRight, Radio, DownloadCloud, FileBox
} from "lucide-react";
import {
  useGetEvent, useRsvp, useCancelRsvp, useJoinWaitlist,
  useGetSavedEvents, useSaveEvent, useUnsaveEvent, useGetPressKit
} from "@/api/events/hooks";
import { useGetResolutions } from "@/api/agm/hooks";
import { ModuleBadge } from "@/components/attend/ModuleBadge";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
        <div className="h-6 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">Could not load event details.</p>
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
    <div className="pb-28 space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero header */}
      <header className="relative overflow-hidden rounded-3xl p-6 text-white md:p-8" style={{ background: color }}>
        <div className="absolute -right-10 -bottom-12 select-none text-[180px] font-black leading-none text-white/10">
          {initialsFor(organiser)}
        </div>
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <ModuleBadge module={event.eventType} solid />
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/85 px-3 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{organiser}</p>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{event.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip icon={CalendarDays}>{formatDate(event.date)}</Chip>
            {event.startTime && <Chip icon={Clock}>{event.startTime}</Chip>}
            {event.registeredCount > 0 && (
              <Chip icon={Users}>{event.registeredCount.toLocaleString()} attending</Chip>
            )}
            {event.venue && <Chip icon={MapPin}>{event.venue}</Chip>}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {event.registered && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur">
                <CheckCircle2 className="h-4 w-4" /> You&apos;re confirmed
              </span>
            )}
            {/* QR check-in is only for events with a physical venue (in-person / hybrid). */}
            {!isVirtual && (
              <Link href={`/events/qr-checkin?eventId=${id}`}>
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/20">
                  <QrCode className="h-4 w-4" /> QR check-in
                </button>
              </Link>
            )}
            <button
              onClick={toggleSave}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
              title={saved ? "Remove from saved" : "Save event"}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-white")} />
            </button>
            <button
              onClick={handleShare}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
              title={shared ? "Link copied!" : "Share event"}
            >
              {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* RSVP feedback — closed / invite-only events return their message here from the backend */}
      {rsvpError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{rsvpError}</p>
        </div>
      )}

      {/* Description + tags */}
      {(event.description || (event.tags && event.tags.length > 0)) && (
        <section className="space-y-3">
          {event.description && (
            <p className="text-sm leading-relaxed text-foreground/80">{event.description}</p>
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

      {/* Details card */}
      <section className="rounded-2xl bg-muted/50 border border-border p-4 space-y-4">
        <DetailRow icon={<CalendarDays className="h-4 w-4" style={{ color }} />}>
          <p className="text-sm font-semibold">{formatDate(event.date)}</p>
          {event.startTime && <p className="text-xs text-muted-foreground">{event.startTime}</p>}
        </DetailRow>
        <hr className="border-border" />
        <DetailRow icon={<FormatIcon className="h-4 w-4" style={{ color }} />}>
          <p className="text-sm font-semibold">{FORMAT_LABEL[event.format] ?? event.format}</p>
          {event.venue && <p className="text-xs text-muted-foreground">{event.venue}</p>}
        </DetailRow>
        {event.maximumCapacity > 0 && (
          <>
            <hr className="border-border" />
            <DetailRow icon={<Users className="h-4 w-4" style={{ color }} />}>
              <p className="text-sm font-semibold">{event.registeredCount.toLocaleString()} registered</p>
              <p className="text-xs text-muted-foreground">of {event.maximumCapacity.toLocaleString()} capacity</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${fill}%`, backgroundColor: color }} />
              </div>
            </DetailRow>
          </>
        )}
      </section>

      {/* AGM module section */}
      {mod === "AGM" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">AGM Actions</h2>
          {kycStatus !== "full" ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">Identity verification required to access AGM actions</p>
              </div>
              <Link href="/bvn" className="text-xs font-semibold text-amber-600 hover:underline shrink-0">Verify</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {event.agmProxyEnabled && !isVirtual && (
                <Link href={`/agm/proxy?eventId=${id}`}>
                  <ActionRow icon={<FileText className="h-5 w-5" style={{ color }} />} label="Appoint a Proxy" />
                </Link>
              )}
              {!isLive && !isEnded && (
                <Link href={`/agm/pre-vote?eventId=${id}`}>
                  <ActionRow icon={<Vote className="h-5 w-5" style={{ color }} />} label="Pre-AGM Voting" />
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* Hackathon / Innovation module section */}
      {mod === "HACKATHON" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Challenge Actions</h2>
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
              <ActionRow icon={<Users className="h-5 w-5" style={{ color }} />} label="My Application" />
            </Link>
          </div>
        </section>
      )}

      {/* Launch module section */}
      {mod === "LAUNCH" && (
        <section className="space-y-3">
          {isUpcoming && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
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
          <h2 className="text-sm font-semibold text-foreground">Audience Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Press / Media", color: "text-purple-700", bg: "bg-purple-50" },
              { label: "VIP Guests", color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Public", color: "text-gray-700", bg: "bg-gray-100" },
            ].map(({ label, color: c, bg }) => (
              <div key={label} className={cn("rounded-xl py-3 px-2 flex items-center justify-center text-center", bg)}>
                <span className={cn("text-xs font-semibold", c)}>{label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
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
          <h2 className="text-sm font-semibold text-foreground">
            {mod === "AGM" ? "Key Participants" : "Speakers"}
          </h2>
          <div className="space-y-2">
            {event.speakers.map((spk) => (
              <div key={spk.id} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initialsFor(spk.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{spk.name}</p>
                  {spk.roleTitle && <p className="text-xs text-muted-foreground">{spk.roleTitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resolutions & Agenda — one combined dot timeline (resolutions carry a badge) */}
      {((event.agenda && event.agenda.length > 0) || (mod === "AGM" && resolutions.length > 0)) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            {mod === "AGM" ? "Resolutions & Agenda" : "Agenda"}
          </h2>
          <div className="space-y-4">
            {[...(event.agenda ?? [])]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((item) => (
                <div key={`agenda-${item.id}`} className="flex gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-sm text-foreground/90">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
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
                      <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground/90">
                            Resolution {r.order + 1}{r.specialResolution ? " · Special" : ""}: {r.title}
                          </p>
                          <div className="shrink-0">{badge}</div>
                        </div>
                        {(r.description || fmtWindow(r.defaultDurationSeconds)) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
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
            <h2 className="text-sm font-semibold text-foreground">Press Kit</h2>
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
                    "flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4",
                    !isReleased && "opacity-60",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isReleased ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <FileBox className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground" title={name}>
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground">{file.sizeLabel}</p>
                    </div>
                  </div>
                  {isReleased ? (
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl bg-muted p-2 hover:bg-muted/80 transition-colors"
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
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur px-4 py-3 md:left-64">
        {isLive ? (
          <Button
            className="w-full gap-2"
            style={{ backgroundColor: color }}
            onClick={() => {
              if (mod === "AGM") router.push(`/agm/live?eventId=${id}`);
              else router.push(`/events/live?eventId=${id}`);
            }}
          >
            <Radio className="h-4 w-4" /> Join Live Session →
          </Button>
        ) : event.waitlisted && !event.registered ? (
          <Button className="w-full" variant="outline" disabled>On waitlist</Button>
        ) : event.registered ? (
          <div className="flex gap-3">
            {/* AGM RSVP cannot be cancelled once LIVE or ENDED — doing so wipes
                the shareholder from the admin register and corrupts quorum data. */}
            {!(mod === "AGM" && (isLive || isEnded)) && (
              <Button className="flex-1" variant="outline" onClick={handleCancelRsvp} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel RSVP"}
              </Button>
            )}
            {mod === "AGM" && !isLive && !isEnded && (
              <Link href={`/agm/pre-vote?eventId=${id}`} className="flex-1">
                <Button className="w-full" style={{ backgroundColor: color }}>Pre-Vote</Button>
              </Link>
            )}
            {mod === "HACKATHON" && (
              <Link href={`/hackathon/apply?challengeId=${id}`} className="flex-1">
                <Button className="w-full" style={{ backgroundColor: color }}>Apply Now</Button>
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
          <div className="space-y-2">
            {rsvpState?.inLateWindow && rsvpState.isOpen && (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-center text-xs font-semibold text-amber-800">
                Late registration open — {rsvpState.minutesLeft}m left
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleRsvp}
              disabled={rsvping || rsvpClosedByCutoff}
              style={{ backgroundColor: rsvpClosedByCutoff ? undefined : color }}
            >
              {rsvping
                ? "Confirming…"
                : rsvpClosedByCutoff
                  ? "Registration Closed"
                  : "Confirm Attendance (RSVP)"}
            </Button>
            {rsvpClosedByCutoff && rsvpState && (
              <p className="text-center text-xs text-muted-foreground">
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

function Chip({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur">
      <Icon className="h-3.5 w-3.5" /> {children}
    </span>
  );
}

function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border">
        {icon}
      </div>
      <div className="flex-1 pt-0.5">{children}</div>
    </div>
  );
}

function ActionRow({
  icon, label, bg = "bg-muted/50", labelColor = "text-foreground",
}: {
  icon: React.ReactNode; label: string; bg?: string; labelColor?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-2xl border border-border px-4 py-3.5 hover:bg-muted/70 transition-colors cursor-pointer", bg)}>
      <div className="flex items-center gap-3">
        {icon}
        <span className={cn("text-sm font-medium", labelColor)}>{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
