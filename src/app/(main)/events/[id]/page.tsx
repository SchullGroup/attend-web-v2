"use client";
import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Clock, MapPin, Users, Bookmark, Share2,
  QrCode, CheckCircle2, Check, Monitor, Wifi, Vote, FileText,
  BookOpen, ShieldAlert, ChevronRight, ChevronDown, Radio, Play, DownloadCloud, FileBox,
  MoreHorizontal, Receipt, ScrollText, MessagesSquare, Headset,
} from "lucide-react";
import {
  useGetEvent, useRsvp, useCancelRsvp, useJoinWaitlist,
  useGetSavedEvents, useSaveEvent, useUnsaveEvent, useGetPressKit, useGetQuorum, useGetStream,
} from "@/api/events/hooks";
import { parseZoomUrl } from "@/lib/zoom";
import { toEmbedUrl } from "@/lib/utils";
import { useGetResolutions, useSubmitQuestion, useCastVote } from "@/api/agm/hooks";
import { useGetMyTeam } from "@/api/hackathon/hooks";
import { PreVoteSheet } from "@/components/attend/PreVoteSheet";
import { ProxySheet } from "@/components/attend/ProxySheet";
import { ReceiptSheet } from "@/components/attend/ReceiptSheet";
import { MinutesSheet } from "@/components/attend/MinutesSheet";
import { VenueMap } from "@/components/attend/VenueMap";
import { QrCheckinSheet } from "@/components/attend/QrCheckinSheet";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { VerifyIdentitySheet } from "@/components/attend/VerifyIdentitySheet";
import { EventBanner } from "@/components/attend/EventBanner";
import { EventMediaGallery } from "@/components/attend/EventMediaGallery";
import { useGoBack } from "@/hooks/useGoBack";
import { useSession } from "@/hooks/useSession";
import { useGetKycStatus, kycKeys } from "@/api/kyc/hooks";
import { useKycGate } from "@/hooks/useKycGate";
import { VoteButtons, type VoteChoice } from "@/components/attend/VoteButtons";
import { AgendaPanel, PanelCard } from "@/components/attend/AgendaPanel";
import { PINNED_MAIN, PINNED_PANEL, PINNED_PANEL_VARS } from "@/lib/pinned-panel";
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
  isEventCurrent,
} from "@/lib/rsvp";

// Laid out to Figma's event-detail frame; OUR logic is preserved wholesale (every hook,
// RSVP/waitlist/cancel handler, KYC gate, module switching, resolutions, press-kit, and
// the CTA state machine). Structure per Figma: a plain banner hero (no text inside it),
// then organiser tile + title + save/share, a single meta line, the module's action row,
// "Details", and the CTA at the end of the column. AGMs additionally get the right-hand
// Agenda / Q&A / Resolution panel. The hero keeps the brand colour because it's real
// backend data (brandPrimary / branding / MODULE_COLOR) standing in for the promo image
// the API doesn't serve.

// Backend formats are upper-case (VIRTUAL/HYBRID/IN_PERSON).
// Same segmented-bar treatment LiveRoom's quorum indicator uses, so the number reads
// identically whether it's shown before or during the meeting.
const QUORUM_SEGMENTS = 20;

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

function EventDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, error } = useGetEvent(id);
  const event = data?.data;

  const [rsvpError, setRsvpError] = useState<string | null>(null);
  // Pre-voting opens as a sheet over this page (Figma's frame shows the detail page
  // dimmed behind it), rather than navigating away to /agm/pre-vote.
  const [preVoteOpen, setPreVoteOpen] = useState(false);
  const [proxyOpen, setProxyOpen] = useState(false);
  // Reached from the AGM "More" menu — same sheets the /agm hub pages use.
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  // The frame shows QR check-in as a modal over this page, not a separate screen.
  // ?qr=1 opens it on arrival — that's how /qr-checkin?eventId= forwards here, so a bookmarked
  // or shared check-in link still lands on the event rather than a bare modal.
  const searchParams = useSearchParams();
  const [qrOpen, setQrOpen] = useState(() => searchParams.get("qr") === "1");
  // NIN — the Innovation/Launch equivalent, shown at the RSVP point.
  const [ninOpen, setNinOpen] = useState(false);
  // Figma: this page IS the live page — "Join Live Event" swaps the hero for the stream
  // rather than navigating anywhere.
  const [joinedLive, setJoinedLive] = useState(false);
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

  // Real history-back, so it returns wherever the user actually came from — Home, a search
  // result, or the module list. The fallback only applies when there's no history to go back to
  // (a shared or pasted link opened in a fresh tab), where `router.back()` alone does nothing;
  // it's module-aware because the four modules are each reached from a different list.
  const goBack = useGoBack(
    mod === "AGM" ? "/agm" : mod === "HACKATHON" ? "/hackathon" : mod === "LAUNCH" ? "/events" : "/general",
  );

  // Browsing an AGM (details, agenda) is always free — verification is only ever demanded when
  // someone tries to act (RSVP, appoint a proxy, pre-vote, open the Resolution tab). The `/agm`
  // segment used to carry a full-page wall in front of everything; that's gone.
  const agmInSession = mod === "AGM" && event?.status === "LIVE";
  // `SHAREHOLDER`, not merely signed-in: a refresh-token-only load reports ANONYMOUS, and
  // firing the query then 401s with `retry: false`, leaving it permanently errored with no data.
  const session = useSession();
  const queryClient = useQueryClient();
  // AGM (BVN) and Innovation/Launch (NIN) both read this: BVN gates AGM actions on `kycStatus`,
  // NIN gates Innovation/Launch RSVPs on `ninVerified`. One query, one cache key.
  const { data: kycResp } = useGetKycStatus(
    (mod === "AGM" || mod === "HACKATHON" || mod === "LAUNCH") && session.type === "SHAREHOLDER",
  );
  const kyc = kycResp?.data;
  const { verifyOpen, kycFull, requireKyc, runPendingKycAction, closeVerify } = useKycGate(kyc);

  // No unverified user gets into an AGM action — not a proxy, not a vote, not an RSVP. Every
  // path into one runs through requireKyc() below, and /agm/* keeps its own layout gate as the
  // backstop for the routes reachable without passing through this page (e.g. /agm/live).
  const agmNeedsKyc = mod === "AGM" && !kycFull;

  // NIN stands where BVN stands for an AGM, but for the other two attendee-facing modules —
  // and it's only a gate for the RSVP, not identity verification. The backend check is two
  // steps (NIN lookup, then a face match); only the face match sets `ninVerified`, and that
  // flag is what lets the RSVP through. Not skippable: someone who can't pass it can't RSVP.
  const needsNin = mod === "HACKATHON" || mod === "LAUNCH";
  const ninContext = mod === "HACKATHON" ? "this challenge" : "this product launch";

  // A dynamic-param navigation (/events/a → /events/b) can reconcile this same component
  // instance rather than remounting it. Without this, a pending action queued on AGM A (its
  // closure captured A's id) could still be sitting there if B's page loads into the same
  // instance — replaying it would act on the wrong event.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { closeVerify(); }, [id]);

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
  // Submission is all-or-nothing (PreVoteSheet.submit() requires every open resolution
  // answered before it allows Submit Vote), so there's no partial-vote state to account
  // for here — every resolution has myVote or none do.
  const allVoted = resolutions.length > 0 && resolutions.every((r) => r.myVote);

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

  // The playable link. The gated /stream endpoint is the real source (403 if not
  // registered, 409 if not live); event.streamUrl is the fallback the admin set. Enabled
  // is read off `event?.…` because the flags below are computed after the early returns.
  const { data: streamResp } = useGetStream(
    id,
    event?.status === "LIVE" && !!(event?.hasRsvped ?? event?.registered),
  );

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

  function doRsvp() {
    setRsvpError(null);
    rsvp(undefined, {
      onError: (err: any) =>
        setRsvpError(err?.response?.data?.message || err?.message || "RSVP failed. Please try again."),
    });
  }

  function handleRsvp() {
    // An AGM RSVP *is* the attendance confirmation the verification modal talks about
    // ("your AGM attendance is confirmed"), so it can't be granted to an unverified user —
    // and once they verify, the RSVP has to actually fire, or that copy is a lie.
    if (agmNeedsKyc) {
      requireKyc(doRsvp);
      return;
    }
    // Innovation and Launch RSVPs need the NIN check passed first. Someone who already passed
    // it RSVPs straight away; anyone else gets the NIN sheet, and the RSVP only fires from its
    // success path (`rsvpAfterNin`). Fails closed: an unresolved status reads as "not passed",
    // so the worst case is showing the sheet to someone who has already done it.
    if (needsNin) {
      if (kyc?.ninVerified) {
        doRsvp();
        return;
      }
      setNinOpen(true);
      return;
    }
    doRsvp();
  }

  // The NIN sheet's success callback. Re-reads `ninVerified` from the query cache rather than
  // trusting this render's `kyc` — same reasoning as `runPendingKycAction`: the sheet's face
  // step awaits its own status refetch, so the cache is authoritative, while this render's
  // copy may predate it. Never RSVPs on a failed or abandoned check.
  function rsvpAfterNin() {
    const fresh = queryClient.getQueryData<typeof kycResp>(kycKeys.status);
    if (!fresh?.data?.ninVerified) return;
    doRsvp();
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
        <div className="h-6 w-24 animate-pulse rounded-lg bg-foreground/4" />
        <div className="h-64 animate-pulse rounded-2xl bg-foreground/4" />
        <div className="h-4 w-full animate-pulse rounded bg-foreground/4" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/4" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-foreground/60">Could not load event details.</p>
        {/* goBack, not router.back() — this state is exactly where a pasted or stale link lands,
            i.e. the case with no history, where a bare back() leaves the user stuck here. */}
        <Button variant="outline" size="sm" onClick={goBack}>Go back</Button>
      </div>
    );
  }

  const color = event.brandPrimary || event.branding?.brandColor || event.organizerPrimaryColor || MODULE_COLOR[mod] || "#0B5CFF";

  // The hero image. This used to render only as a separate full-width poster further down the
  // page while the hero stayed a flat colour block — so an event with perfectly good artwork
  // still showed a big empty rectangle at the top, which is what the frames don't do.
  const heroArt = event.flyerUrl || event.bannerUrl || null;

  // Launches and General follow the "About event" frame: one narrow column, artwork hero,
  // then title / organiser / meta / description / CTA. AGM and Innovation carry extra
  // sections (agenda panel, action tiles, resolutions) and keep the wider layout.
  const isSimpleLayout = mod === "LAUNCH" || mod === "GENERAL";
  const organiser = event.registerName || event.organizerName;
  // `registered` means "eligible" for an AGM shareholder (register membership), not
  // necessarily an actual RSVP — that's what broke Cancel RSVP/Appoint Proxy for someone
  // who was only added to the register. `hasRsvped` is the real signal; fall back to
  // `registered` only while backend hasn't deployed that field yet, so this doesn't regress
  // already-registered users into seeing the RSVP button again in the meantime.
  const hasRsvped = event.hasRsvped ?? event.registered;
  const isLive = event.status === "LIVE";
  const isEnded = event.status === "ENDED";
  // `isEventCurrent`, not `!isLive && !isEnded` — that bare check let the Launch "Launching
  // soon" countdown below show a positive day count (or "Launching today!") for an event whose
  // date had already passed but whose status was never flipped (reported 2026-09-15).
  const isUpcoming = isEventCurrent(event, { excludeLive: true });
  // Case-insensitive: this gates the venue map and QR check-in, and a lower-case "virtual"
  // slipping through would put a map on an online-only event.
  const isVirtual = (event.format || "").toUpperCase() === "VIRTUAL";
  // A VIRTUAL/HYBRID event can now be LIVE with no join link yet — Zoom links are no
  // longer minted at creation time. Show an unavailable state rather than a dead button.
  const needsStreamLink = event.format === "VIRTUAL" || event.format === "HYBRID";
  // Same precedence LiveRoom uses: the gated /stream link wins, the admin's link is the
  // fallback. Reading both means a live event whose link only exists behind /stream no
  // longer shows "Join link not available yet".
  const streamUrl =
    ((streamResp?.data as Record<string, unknown> | undefined)?.streamUrl as string) ||
    event.streamUrl ||
    "";
  // AGMs keep the in-app live room — the live ballot, quorum and proxy voting only exist
  // there and have no equivalent on Zoom/YouTube.
  const agmLive = mod === "AGM";
  const missingStreamLink = agmLive ? needsStreamLink && !streamUrl : !streamUrl;
  // Zoom needs the page cross-origin isolated, which costs a full ?coi=1 reload — so Zoom
  // goes to the dedicated room. Everything else (YouTube/Vimeo) plays in the hero.
  const zoomStream = parseZoomUrl(streamUrl);

  function joinLive() {
    if (agmLive) {
      requireKyc(() => router.push(`/agm/live?eventId=${id}`));
      return;
    }
    if (zoomStream) {
      router.push(`/events/live?eventId=${id}`);
      return;
    }
    if (streamUrl) setJoinedLive(true);
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
      {/* On every module, including Launches/General. Those two were briefly gated out because
          their frame shows no in-page back control, but the app-bar title is context, not
          navigation — it left those pages with no way back at all. */}
      <button
        onClick={goBack}
        className="inline-flex w-fit items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
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
          // Launches/General: content sits directly on the white page in a narrow left column
          // with a vertical rule down its right edge — NOT a bordered, shadowed card. An
          // earlier pass carded this wrapper, which made the whole page read as one floating
          // component instead of a page.
          isSimpleLayout &&
            "lg:max-w-[640px] lg:border-r lg:border-foreground/8 lg:pr-8",
        )}
        style={mod === "AGM" ? PINNED_PANEL_VARS : undefined}
      >
        <div className={cn("flex min-w-0 flex-col gap-6", mod === "AGM" && PINNED_MAIN)}>

      {/* Teaser gallery — organiser-uploaded promo images/video, sat above the hero per the
          Figma reference. Renders nothing when the event has none. */}
      {event.launchMedia && event.launchMedia.length > 0 && (
        <EventMediaGallery media={event.launchMedia} />
      )}

      {/* Hero — Figma's detail hero is a *plain* banner: no title, chips, badges or controls sit
          inside it. Those all live below it on the page background. Artwork resolution is the
          three-tier chain in EventBanner (flyer → company logo on its own colour → module
          poster), which replaced a solid brand-colour field with the organiser's initials
          watermarked over it. Live turns it into a video preview with a play control. */}
      {joinedLive && streamUrl ? (
        <header
          className={cn(
            "relative overflow-hidden",
            isSimpleLayout ? "rounded-xl" : "rounded-2xl",
            isLive ? "aspect-[649/301]" : "aspect-[649/193]",
          )}
          style={{ background: color }}
        >
          {/* Same embed LiveRoom uses. `credentialless` keeps this cross-origin iframe
              loading if the page is ever cross-origin isolated (see next.config headers). */}
          <iframe
            {...({ credentialless: "" } as any)}
            src={toEmbedUrl(streamUrl)}
            title={event.title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </header>
      ) : (
        <EventBanner
          flyerUrl={heroArt}
          logoUrl={event.branding?.logoUrl || event.organizerLogo}
          module={mod}
          seed={organiser || event.title}
          className={cn(
            // Inset inside the card on Launches/General, so a slightly tighter radius reads right.
            isSimpleLayout ? "rounded-xl" : "rounded-2xl",
            // The taller frame is for the live video preview (it holds a play control). An ENDED
            // event has no player, so it keeps the frame's short, wide banner.
            isLive ? "aspect-[649/301]" : "aspect-[649/193]",
          )}
        >
          <>
            {isLive && (
              // z-10, not z-20 — the sticky "About event" nav bar (NavShell.tsx) is also
              // z-20, and as the hero scrolls under it this badge (later in the DOM, same
              // stacking level) was painting on top of the header instead of under it.
              <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
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
          </>
        </EventBanner>
      )}

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
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/4 hover:text-foreground"
              >
                <Bookmark className={cn("h-[18px] w-[18px]", saved && "fill-foreground text-foreground")} />
              </button>
              {/* Frames show only the bookmark on Launches/General. Share stays everywhere
                  else rather than being dropped from the app outright. */}
              {!isSimpleLayout && (
                <button
                  onClick={handleShare}
                  title={shared ? "Link copied!" : "Share event"}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/4 hover:text-foreground"
                >
                  {shared ? <Check className="h-[18px] w-[18px]" /> : <Share2 className="h-[18px] w-[18px]" />}
                </button>
              )}
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
            {/* Resolved AGM override → organisation setting → platform default; the backend
                sends it for every event type now, "never null" — no module gate needed. Plain
                mailto: opens whatever mail app the browser is set to hand off to.
                Pill styled like NavShell's active nav item (same green pair, `#e6f4ec` /
                `#0A3D2E`), hardcoded rather than text-primary/bg-primary for the same reason
                NavShell's comment gives: `--primary` resolves to a near-black navy, and this is
                meant to read as the brand green, not the theme's neutral accent. */}
            {event.supportEmail && (
              <a
                href={`mailto:${event.supportEmail}?subject=${encodeURIComponent(`Help with ${event.title}`)}`}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95"
                style={{ backgroundColor: "#e6f4ec", color: "#0A3D2E" }}
              >
                <Headset className="h-3.5 w-3.5" /> Contact us
              </a>
            )}
            {/* Same row as date/attendees/Contact us, not the venue row below — AGM keeps its
                own entry via the More menu instead (unchanged), matching the frame. */}
            {mod !== "AGM" && !isVirtual && (
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/4"
              >
                <QrCode className="h-3.5 w-3.5" /> QR check-in
              </button>
            )}
            {/* The frame's meta line is just date/time and the participant count. Format and
                venue stay on the other modules; on Launches/General the venue is already the
                heading of the map directly below, so repeating it here is noise. */}
            {!isSimpleLayout && (
              <span className="inline-flex items-center gap-1.5">
                <FormatIcon className="h-3.5 w-3.5" />
                {FORMAT_LABEL[event.format] ?? event.format}
              </span>
            )}
            {!isSimpleLayout && event.venue && (
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

        </div>
      </div>

      {/* The frame rules off the title/meta header from the body below it (that's the line the
          Overview/Prizes tabs sit on). Negative margin cancels the column's flex gap so the
          rule reads as a divider between two blocks rather than a floating line. */}
      {isSimpleLayout && <hr className="-my-1 border-foreground/8" />}

      {/* Capacity — the slim bar replaces the old card's capacity row. Hidden on AGMs:
          registered/capacity doesn't matter there once the quorum bar (shareholder
          turnout) is showing directly below it in the AGM section. */}
      {mod !== "AGM" && event.maximumCapacity > 0 && (
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

      {/* REMOVED 2026-09-15 — this repeated the exact same flyer already shown in the hero
          above, just uncropped. The idea was that a wide crop could clip a flyer's logo or
          date text, so this full-size copy was added as a safety net. In practice it read as
          a duplicate banner (reported by the user), not a safety net — Launches/General never
          had this second copy and were never missing content because of it. Now every module
          shows its flyer exactly once, in the hero, matching Launches/General. If a specific
          flyer's crop is genuinely losing important text, that's a hero-crop problem to solve
          (e.g. a gentler crop or object-contain there), not a reason to repeat the whole image. */}

      {/* AGM module section — Figma renders these as an equal-width icon-over-label tile
          row (not the list rows the other modules use), with the live quorum bar above.
          Still shown once the AGM has ENDED: this block used to be hidden entirely then,
          which took Minutes and My receipts with it — the two things you specifically want
          *after* a meeting, and this page's only route to them. Proxy and Pre-AGM Voting
          hide themselves below instead, since neither is actionable on a finished AGM. */}
      {mod === "AGM" && (
        <section className="flex flex-col gap-3">
          {quorum && (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs tracking-[-0.12px] text-foreground">
                  Quorum <span className="text-[10px] text-foreground/50">({quorum.pct}%)</span>
                </p>
                <div className="mt-1.5 flex gap-[3px]" role="img" aria-label={`Quorum ${quorum.pct}%`}>
                  {Array.from({ length: QUORUM_SEGMENTS }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2.5 w-1.5 rounded-[1px]",
                        i < Math.round((Math.min(quorum.pct, 100) / 100) * QUORUM_SEGMENTS)
                          ? "bg-amber-400"
                          : "bg-foreground/10",
                      )}
                    />
                  ))}
                </div>
              </div>
              {quorum.total !== null && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{quorum.total.toLocaleString()}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-foreground/60">
                    <Users className="h-3.5 w-3.5" /> Shareholders
                  </p>
                </div>
              )}
            </div>
          )}

          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">AGM Actions</h2>

          {/* Both tiles always show now — verification is demanded per action (requireKyc),
              not up front. An unverified/under-review/declined click still opens the sheet;
              it reads the KYC status itself and shows the right stage (form, review notice,
              declined notice), so there's no separate banner duplicating that decision here. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {/* Neither of these two survives the meeting ending. */}
              {event.agmProxyEnabled && !isEnded && (
                <button
                  type="button"
                  onClick={() => requireKyc(() => setProxyOpen(true))}
                  className="text-left"
                >
                  <ActionTile
                    icon={<FileText className="h-5 w-5" style={{ color }} />}
                    label={hasProxy ? "Change Proxy" : "Appoint a Proxy"}
                  />
                </button>
              )}
              {/* Pre-voting closes once the meeting is live — live votes are cast in the
                  meeting room's ballot instead. */}
              {!isLive && !isEnded && (
                <button
                  type="button"
                  onClick={() => requireKyc(() => setPreVoteOpen(true))}
                  className="text-left"
                >
                  <ActionTile
                    icon={<Vote className="h-5 w-5" style={{ color }} />}
                    label={allVoted ? "Voted" : "Pre-AGM Voting"}
                    voted={allVoted}
                  />
                </button>
              )}

              {/* "More" — the frame folds receipts, minutes and QR check-in behind one tile.
                  Receipts and Minutes reuse the same sheets the /agm hub pages open; they
                  take the same {eventId, open, onClose} contract as the proxy/pre-vote sheets
                  and portal through Dialog, so they mount with the others at the foot of the
                  page. QR stays a navigation — it's a full page, not a sheet.
                  Gated like Proxy/Pre-Vote: the trigger click goes through requireKyc rather
                  than opening the dropdown directly, so an unverified click prompts instead —
                  the dropdown opens on its own once verification lands. */}
              <Menu
                align="right"
                open={moreOpen}
                onOpenChange={(next) => (next ? requireKyc(() => setMoreOpen(true)) : setMoreOpen(false))}
                trigger={
                  <ActionTile
                    icon={<MoreHorizontal className="h-5 w-5" style={{ color }} />}
                    label="More"
                  />
                }
              >
                {(close) => (
                  <>
                    <MenuItem
                      icon={<Receipt className="h-4 w-4" />}
                      label="My receipts"
                      trailing={<ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />}
                      onSelect={() => {
                        close();
                        setReceiptOpen(true);
                      }}
                    />
                    <MenuItem
                      icon={<ScrollText className="h-4 w-4" />}
                      label="Minutes"
                      trailing={<ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />}
                      onSelect={() => {
                        close();
                        setMinutesOpen(true);
                      }}
                    />
                    {!isVirtual && (
                      <MenuItem
                        icon={<QrCode className="h-4 w-4" />}
                        label="QR check-in"
                        trailing={<ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />}
                        onSelect={() => {
                          close();
                          setQrOpen(true);
                        }}
                      />
                    )}
                  </>
                )}
              </Menu>
          </div>
        </section>
      )}

      {/* Venue map — the frame sits it between the action row and Details. Only meaningful
          for an event someone can physically attend, and only as good as the free-text venue
          it geocodes from (there is no lat/lng on the event). */}
      {!isVirtual && event.venue && <VenueMap venue={event.venue} />}

      {/* Figma puts the blurb under a heading, after the action row. The Launches/General
          frames title it "About this event"; the other modules keep the shorter "Details". */}
      {(event.description || (event.tags && event.tags.length > 0)) && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">
            {isSimpleLayout ? "About this event" : "Details"}
          </h2>
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
          {/* Neutral card matching the rest of the page (InfoBlock, speaker rows) — was a
              hardcoded orange-50/700/900 block that clashed with whatever colour this event's
              own brand actually is. The countdown number is the one accent, tinted with the
              same resolved `color` every other per-event accent on this page already uses. */}
          {isUpcoming && (
            <div className="rounded-xl border border-foreground/6 bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Launching soon</p>
              <p className="mb-0.5 text-2xl font-bold" style={{ color }}>
                {(() => {
                  const d = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
                  return d > 0 ? `${d} day${d !== 1 ? "s" : ""} to go` : "Launching today!";
                })()}
              </p>
              <p className="text-sm text-foreground/60">
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
          <div className="rounded-xl border border-foreground/6 bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            <p className="mb-1 text-sm font-semibold text-foreground">Press Kit</p>
            <p className="text-sm leading-relaxed text-foreground/60">
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
              <div key={spk.id} className="flex items-center gap-3 rounded-xl border border-foreground/6 bg-white px-4 py-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
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
                    "flex items-center justify-between gap-3 rounded-xl border border-foreground/6 bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]",
                    !isReleased && "opacity-60",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
                      isReleased ? "bg-primary/10 text-primary" : "bg-foreground/4 text-foreground/60"
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
                      className="shrink-0 rounded-[10px] bg-foreground/4 p-2 transition-colors hover:bg-foreground/8"
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
            onJoinLive={() => requireKyc(() => router.push(`/agm/live?eventId=${id}`))}
            requireKyc={requireKyc}
          />
        )}

      {/* Primary CTA — Figma sits it at the end of the content column, full width of that
          column. (It used to be a viewport-wide fixed bar pinned over the whole app.) A sibling
          of the column, not a child, so it falls below the side panel on mobile as the mobile
          frame shows; on desktop the AGM panel is pinned out of flow, so it follows the content. */}
      <div className={cn("pt-1", mod === "AGM" && PINNED_MAIN)}>
        {isLive && hasRsvped ? (
          missingStreamLink ? (
            <Button className="w-full gap-2" variant="outline" disabled>
              <Radio className="h-4 w-4" /> Join link not available yet
            </Button>
          ) : joinedLive ? (
            // Already playing in the hero — Figma shows no CTA in this state.
            null
          ) : (
            <Button
              className="w-full gap-2"
              style={{ backgroundColor: color }}
              onClick={joinLive}
            >
              <Radio className="h-4 w-4" /> Join Live Event
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
                variant={allVoted ? "outline" : undefined}
                style={allVoted ? undefined : { backgroundColor: color }}
                onClick={() => requireKyc(() => setPreVoteOpen(true))}
              >
                {allVoted ? (
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Voted
                  </span>
                ) : (
                  "Pre-Vote"
                )}
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
      {receiptOpen && (
        <ReceiptSheet eventId={id} open onClose={() => setReceiptOpen(false)} />
      )}
      {minutesOpen && (
        <MinutesSheet eventId={id} open onClose={() => setMinutesOpen(false)} />
      )}
      {qrOpen && (
        <QrCheckinSheet eventId={id} open onClose={() => setQrOpen(false)} />
      )}
      {verifyOpen && (
        <VerifyIdentitySheet
          open
          live={isLive}
          // The sheet only ever opens because a click called requireKyc() — never automatically
          // — so there's nothing to bounce away from either way this closes. A decline just
          // drops the pending action (closeVerify) and leaves the user exactly where they were.
          onClose={closeVerify}
          onVerified={runPendingKycAction}
        />
      )}
      {ninOpen && (
        <VerifyIdentitySheet
          open
          mode="nin"
          live={isLive}
          contextLabel={ninContext}
          onClose={() => setNinOpen(false)}
          onVerified={rsvpAfterNin}
        />
      )}
    </div>
  );
}

// useSearchParams (for ?qr=1) needs a Suspense boundary to keep this route renderable.
export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <EventDetailInner params={params} />
    </Suspense>
  );
}

// Figma's AGM action row — equal-width icon-over-label tiles, as opposed to ActionRow's
// list treatment which the other modules keep.
function ActionTile({ icon, label, voted }: { icon: React.ReactNode; label: string; voted?: boolean }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-foreground/6 bg-white px-2 py-3.5 text-center transition-colors hover:bg-foreground/2">
      {voted && (
        <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-emerald-600" />
      )}
      {icon}
      <span className="text-xs font-medium leading-tight tracking-[-0.12px] text-foreground">{label}</span>
    </div>
  );
}

// The persistent right-hand panel on Figma's AGM detail layout. Q&A has no pre-session
// endpoint (questions only exist inside the live room's websocket session), so that tab
// points into the meeting rather than inventing an inbox the backend doesn't serve.
function AgmSidePanel({
  eventId, speakers, agenda, resolutions, isLive, canJoinLive, onJoinLive, requireKyc,
}: {
  eventId: string;
  speakers: SpeakerItem[];
  agenda: AgendaItemDetail[];
  resolutions: Resolution[];
  isLive: boolean;
  canJoinLive: boolean;
  onJoinLive: () => void;
  requireKyc: (action: () => void) => void;
}) {
  const [tab, setTab] = useState<"agenda" | "qa" | "resolution">("agenda");
  // Q&A composer — POST /participant/events/{id}/questions. The endpoint accepts a question
  // at any time, but the composer is gated on the meeting being live: a question sent days
  // ahead reaches no Chair and no moderator. The real-time question *feed* is websocket-bound
  // and stays in LiveRoom; this panel offers the composer plus a way into the session.
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
    // Pinned to the window's right edge at xl (see lib/pinned-panel); stacks under the content below.
    <aside className={cn("flex flex-col gap-3", PINNED_PANEL)}>
      <div className="flex gap-1 border-b border-foreground/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            // Resolution content (and the ability to vote) is whole-tab-gated — unlike Agenda
            // and Q&A, which are free to browse. Clicking it while unverified opens the sheet
            // instead of switching; the switch itself becomes the pending action, so it happens
            // automatically once verification lands.
            onClick={() => (t.key === "resolution" ? requireKyc(() => setTab(t.key)) : setTab(t.key))}
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

      {tab === "agenda" && <AgendaPanel speakers={speakers} agenda={agenda} />}

      {/* Q&A only opens once the meeting is in session — a question asked days early has no
          Chair to reach and no moderator watching. The composer is replaced rather than just
          disabled, so it's clear this is "not yet" and not a broken input. */}
      {tab === "qa" && !isLive && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/15 p-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/4">
            <MessagesSquare className="h-5 w-5 text-foreground/40" />
          </span>
          <div>
            <p className="text-sm font-medium tracking-[-0.14px] text-foreground">
              Q&amp;A opens when the meeting starts
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              You&apos;ll be able to send questions to the Chair once this AGM is live.
            </p>
          </div>
        </div>
      )}

      {tab === "qa" && isLive && (
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
            className="w-full rounded-xl border border-transparent bg-foreground/4 p-3.5 text-sm tracking-[-0.14px] text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:bg-white"
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
    <article className="rounded-xl border border-foreground/6 bg-white p-4">
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
      className={cn("flex items-center justify-between rounded-xl border border-foreground/6 px-4 py-3.5 transition-colors hover:bg-foreground/6 cursor-pointer", bg)}
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
