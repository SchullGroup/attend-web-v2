"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Users,
  MessageSquare,
  Vote,
  Send,
  Check,
  X,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ThumbsUp,
  Clock,
  BarChart2,
  FileBox,
  DownloadCloud,
  CalendarDays,
} from "lucide-react";
import { useGetEvent, useGetStream, useGetCountdown, useGetQuorum, useGetActivePoll, useRespondToPoll, useGetPressKit, useGuestEventView, useGuestResolutions, useGuestQuestions, useGuestSubmitQuestion, useGuestUpvoteQuestion, useGuestPolls, useGuestRespondToPoll, useGuestProxyVote, useGuestVote } from "@/api/events/hooks";
import { useGetMe } from "@/api/auth/hooks";
import { ZoomStage } from "@/components/attend/ZoomStage";
import { AgendaPanel } from "@/components/attend/AgendaPanel";
import { parseZoomUrl } from "@/lib/zoom";
import {
  useGetResolutions,
  useCastVote,
  useGetQuestions,
  useSubmitQuestion,
  useUpvoteQuestion,
} from "@/api/agm/hooks";
import { useQaSocket } from "@/api/agm/qa-socket";
import { Button } from "@/components/ui/Button";
import { cn, toEmbedUrl, fileDisplayName } from "@/lib/utils";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { Resolution, type AgendaItemDetail, type SpeakerItem } from "@/types";
import { useSession } from "@/hooks/useSession";
import { GUEST_TOKEN_KEY, getGuestName } from "@/lib/guest-session";
import { NomineeBallot, CandidateTally } from "@/components/attend/NomineeBallot";
import { SourceBreakdown } from "@/components/attend/SourceBreakdown";
import Cookies from "js-cookie";

type Tab = "qa" | "ballot" | "poll" | "presskit" | "agenda";
type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

function fmtCountdown(total: number): string {
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface LiveRoomProps {
  eventId: string;
  // AGMs show the live ballot; general events show only video + Q&A.
  showBallot?: boolean;
  backHref?: string;
  backLabel?: string;
  // TEMP: force a Zoom meeting (number + plain passcode) instead of the event's
  // streamUrl — for testing the live room before the backend flow exists.
  zoomOverride?: { meetingNumber: string; passcode: string };
}

export function LiveRoom({
  eventId,
  showBallot = true,
  backHref,
  backLabel = "Leave meeting",
  zoomOverride,
}: LiveRoomProps) {
  const defaultBackHref = eventId ? `/events/${eventId}` : "/events";
  const resolvedBackHref = backHref || defaultBackHref;
  const session = useSession();
  // Trust useSession alone. This used to also OR in a raw sessionStorage read, which
  // overrode useSession's precedence: a leftover guest token from an earlier guest visit
  // made a fully signed-in shareholder register as a guest — and lose the vote.
  // A real account always wins; useSession enforces that.
  const isGuest = session.type === "GUEST";
  const [guestToken, setGuestToken] = useState<string>("");

  useEffect(() => {
    if (isGuest) setGuestToken(sessionStorage.getItem(GUEST_TOKEN_KEY) ?? "");
  }, [isGuest]);

  const { data: eventResp } = useGetEvent(eventId, !isGuest);
  const { data: guestViewResp } = useGuestEventView(eventId, guestToken, isGuest && !!guestToken);

  const event = isGuest ? guestViewResp?.data : eventResp?.data;
  // The participant payload calls it `title`; the guest join/view payload calls it
  // `eventTitle` — reading only `title` left every guest on the "Live session" fallback.
  const title =
    event?.title ?? (event as { eventTitle?: string } | undefined)?.eventTitle ?? "Live session";
  const organiser = event?.registerName || event?.organizerName || "";
  // §7 register branding — present on both participant and guest event payloads.
  const brandColor = event?.branding?.brandColor || undefined;
  const brandLogo = event?.branding?.logoUrl || undefined;
  const isLive = event?.status === "LIVE";

  // Stream link: prefer the gated /stream endpoint (only resolves when live +
  // registered); fall back to the streamUrl the admin set on the event.
  const { data: streamData } = useGetStream(eventId, isLive && !isGuest);
  const { data: quorumData } = useGetQuorum(eventId, isLive && !isGuest);

  const watching = (() => {
    const qMap = (quorumData?.data ?? {}) as Record<string, unknown>;
    const liveCountFromQuorum =
      qMap.attendeeCount ??
      qMap.attendeesCount ??
      qMap.currentAttendees ??
      qMap.activeAttendees ??
      qMap.presentCount ??
      qMap.onlineCount ??
      qMap.activeViewers ??
      qMap.viewersCount;

    const sMap = (streamData?.data ?? {}) as Record<string, unknown>;
    const liveCountFromStream =
      sMap.activeViewers ??
      sMap.viewersCount ??
      sMap.onlineCount ??
      sMap.attendeeCount ??
      sMap.attendeesCount;

    const eMap = (event ?? {}) as Record<string, unknown>;
    const liveCountFromEvent =
      eMap.attendeesCount ??
      eMap.attendeeCount ??
      eMap.activeViewers ??
      eMap.viewersCount ??
      eMap.onlineCount ??
      eMap.currentAttendees;

    if (typeof liveCountFromQuorum === "number" && liveCountFromQuorum > 0) return liveCountFromQuorum;
    if (typeof liveCountFromStream === "number" && liveCountFromStream > 0) return liveCountFromStream;
    if (typeof liveCountFromEvent === "number" && liveCountFromEvent > 0) return liveCountFromEvent;
    return event?.registeredCount ?? 0;
  })();
  
  let streamUrl = "";
  if (isGuest) {
    streamUrl = (guestViewResp?.data?.streamUrl as string) || event?.streamUrl || "";
  } else {
    streamUrl = (streamData?.data?.streamUrl as string) || event?.streamUrl || "";
  }

  // If the stream is a Zoom meeting we render the Zoom SDK; otherwise the iframe.
  // A zoomOverride (test-only) takes precedence over the event's streamUrl.
  const zoom = zoomOverride?.meetingNumber ? zoomOverride : parseZoomUrl(streamUrl);
  const displayName = session.user?.fullName || (isGuest ? getGuestName() : "Participant");
  const canVote = !isGuest && (session.user ? session.user.capabilities.includes("VOTE") : true);
  // §11: a guest who signed in with a proxy code (or proxy QR) at /join gets canVote:true
  // on the view payload, and may then vote directly — no per-vote code entry. Read live
  // from the polled view so a resumed session re-checks it without re-parsing the token.
  const guestCanVote = isGuest && !!(guestViewResp?.data as { canVote?: boolean } | undefined)?.canVote;
  // A guest with no proxy rights watches the ballot for the record: every resolution and
  // its live tally, but none of the voting apparatus — no per-resolution status badge, no
  // countdown, no FOR/AGAINST/ABSTAIN. Showing an "Open" badge to someone who cannot act
  // on it reads as a prompt they're being denied.
  const ballotReadOnly = isGuest && !guestCanVote;
  const canSubmitQA = session.user ? session.user.capabilities.includes("QA") : true;

  // Zoom's gallery view needs SharedArrayBuffer → the page must be cross-origin
  // isolated. Isolate ONLY for Zoom meetings by reloading once with `?coi=1`
  // (next.config applies COOP/COEP for that flag). Non-Zoom pages stay un-isolated,
  // so YouTube/Vimeo iframe streams keep working on every browser.
  // "ready" once the page is isolated (or we tried and the browser won't isolate —
  // e.g. Safari/Firefox, where Zoom still works, just without gallery view). We hold
  // ZoomStage back until then so the SDK isn't downloaded on a page we're about to
  // navigate away from (that race left the SDK global unset).
  const [coiState, setCoiState] = useState<"unknown" | "pending" | "ready">("unknown");
  const zoomMn = zoom?.meetingNumber;
  useEffect(() => {
    if (!zoomMn || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const alreadyTried = url.searchParams.get("coi") === "1";
    if (window.crossOriginIsolated || alreadyTried) {
      setCoiState("ready");
      return;
    }
    setCoiState("pending");
    url.searchParams.set("coi", "1");
    window.location.replace(url.toString());
  }, [zoomMn]);

  // Countdown to start — only polled before the event is live.
  // Everything below hits *participant* endpoints, which 401/403 for a guest by design.
  // They're gated on !isGuest so a guest doesn't fire a burst of doomed requests on entry.
  const { data: cdData } = useGetCountdown(eventId, !!event && !isLive && !isGuest);
  const cdSecs =
    typeof cdData?.data?.secondsUntilStart === "number" ? cdData.data.secondsUntilStart : null;

  // Live quorum (AGM ballot only). Response is a generic map — read the percentage
  // defensively; show "—" rather than a fabricated number if it's not present.
  const quorumPct = (() => {
    const m = (quorumData?.data ?? {}) as Record<string, unknown>;
    const raw =
      m.quorumPercentage ?? m.percentage ?? m.currentPercentage ?? m.presentPercentage ?? m.attendancePercentage;
    return typeof raw === "number" ? Math.round(raw) : null;
  })();

  // Only AGMs poll resolutions for the live ballot.
  const { data: resData } = useGetResolutions(
    eventId,
    showBallot && !isGuest ? 5000 : undefined,
    showBallot && !isGuest,
  );
  // Proxy guests read the same resolutions from their own view-only endpoint, so the
  // ballot panel shows live tallies. Gated on guestCanVote, not just isGuest — backend
  // hard-blocks this endpoint (403) for a plain guest as of 2026-08-17, so firing it for
  // one would just be a doomed request every 5s.
  const { data: guestResData } = useGuestResolutions(
    eventId,
    guestToken,
    showBallot && guestCanVote,
    5000,
  );
  const { mutate: castVote, isPending: voting } = useCastVote(eventId);

  // The guest payload is a bare array; the participant one nests under `resolutions`.
  const resolutions = (isGuest ? guestResData?.data : resData?.data?.resolutions) ?? [];
  // A guest can't hold a proxy, and their payload carries no such flag.
  const hasProxy = !isGuest && !!resData?.data?.hasProxy;

  const pollEnabled = !showBallot && isLive;
  const { data: participantPollResp } = useGetActivePoll(eventId, pollEnabled && !isGuest ? 5000 : undefined, pollEnabled && !isGuest);
  const { data: guestPollResp } = useGuestPolls(eventId, guestToken, pollEnabled && isGuest ? 5000 : undefined, pollEnabled && isGuest && !!guestToken);
  const activePoll = isGuest ? guestPollResp?.data : participantPollResp?.data;

  const { mutate: respondToParticipantPoll, isPending: submittingParticipantPoll } = useRespondToPoll(eventId);
  const { mutate: respondToGuestPoll, isPending: submittingGuestPoll } = useGuestRespondToPoll(eventId, guestToken);
  const respondToPoll = isGuest ? respondToGuestPoll : respondToParticipantPoll;
  const submittingPoll = isGuest ? submittingGuestPoll : submittingParticipantPoll;

  const { mutate: guestProxyVote, isPending: guestProxyVoting } = useGuestProxyVote(eventId, guestToken);
  const { mutate: guestVote, isPending: guestVoting } = useGuestVote(eventId, guestToken);
  const [proxyCode, setProxyCode] = useState("");
  // In the guest read-only ballot the proxy-code entry is collapsed behind this toggle.
  // It's the only way a plain guest can reach the vote buttons, so it can't be deleted —
  // but it stays out of sight for the majority of guests, who hold no proxy.
  const [showProxyEntry, setShowProxyEntry] = useState(false);
  // A proxy guest and a voting participant share the same ballot; this is its busy flag.
  const castPending = voting || guestVoting;

  // Press Kit — product launches only. Poll while live so files flip to "released"
  // as the organiser releases them.
  const isLaunch = event?.eventType === "PRODUCT_LAUNCH";
  const { data: pressKitResp, error: pressKitError } = useGetPressKit(
    eventId,
    isLaunch && isLive && !isGuest ? 10000 : undefined,
    isLaunch && !isGuest,
  );
  const pressKit = pressKitResp?.data;
  // 403 → the participant isn't registered for this event (press kit is gated).
  const pressKitForbidden =
    (pressKitError as { response?: { status?: number } } | null)?.response?.status === 403;

  // When the register has no share weighting, shares are all 0 — ResolutionBars falls back
  // to head counts on its own, so the tally doesn't need a flag to gate them.
  // The ballot shows one open resolution at a time and advances to the next unvoted one
  // as soon as a vote succeeds. `locallyVoted` marks just-cast resolutions optimistically
  // (myVote only arrives on the next ~5s poll); `manualResId` lets the user step back to
  // an earlier open resolution to review/change it, and is cleared on the next cast.
  const [locallyVoted, setLocallyVoted] = useState<Set<string>>(new Set());
  const [manualResId, setManualResId] = useState<string | null>(null);
  // Transient "vote recorded" note that survives the auto-advance (voteMsg is tied to the
  // resolution and gets reset the instant we move on).
  const [advanceNote, setAdvanceNote] = useState<string | null>(null);

  // Status-driven (secondsRemaining is null while a resolution is WAITING).
  const isOpenRes = (r: Resolution) =>
    (r.status || "").toUpperCase() === "OPEN" || r.secondsRemaining > 0;
  const isResVoted = (r: Resolution) => !!r.myVote || locallyVoted.has(r.id);
  // Stable 1-based numbering by position — resolution.order isn't reliably 0-based,
  // which is what produced "6 of 5". Number by index so the count always tallies.
  const sortedRes = [...resolutions].sort((a, b) => a.order - b.order);
  const openResolutions = sortedRes.filter(isOpenRes);
  // First open resolution the user hasn't voted on; once all open ones are voted, fall
  // back to the last so its "Vote Recorded" (with Change vote) still shows. A manual
  // prev/next pick overrides the auto choice until the next successful cast.
  const autoOpenRes =
    openResolutions.find((r) => !isResVoted(r)) ?? openResolutions[openResolutions.length - 1];
  const openRes =
    (manualResId ? openResolutions.find((r) => r.id === manualResId) : undefined) ?? autoOpenRes;

  const openIdx = openRes ? openResolutions.findIndex((r) => r.id === openRes.id) : -1;
  const hasPrevOpen = openIdx > 0;
  const hasNextOpen = openIdx >= 0 && openIdx < openResolutions.length - 1;
  const gotoPrevOpen = () => {
    if (hasPrevOpen) setManualResId(openResolutions[openIdx - 1].id);
  };
  const gotoNextOpen = () => {
    if (hasNextOpen) setManualResId(openResolutions[openIdx + 1].id);
  };
  // On a successful cast: remember it (so the ballot advances now, not on the next poll),
  // drop any manual selection so it moves forward, and flash a short confirmation.
  const markVoted = (id: string) => {
    setLocallyVoted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setManualResId(null);
    setAdvanceNote("Your vote was recorded.");
    window.setTimeout(() => setAdvanceNote(null), 3500);
  };

  const allClosed =
    resolutions.length > 0 && resolutions.every((r) => (r.status || "").toUpperCase() === "CLOSED");
  // Open while a resolution is live, Closed only when every one has closed,
  // otherwise Waiting (resolutions exist but none has been opened yet).
  const ballotStatus = openRes ? "Open" : allClosed ? "Closed" : resolutions.length ? "Waiting" : "—";
  const openPos = openRes ? sortedRes.findIndex((r) => r.id === openRes.id) + 1 : null;

  // Real-time Q&A over WebSocket; polling stays as a slow (30s) fallback.
  // The socket authenticates with accessToken, which a guest doesn't have — left
  // unconnected it would retry every 5s forever. Guest Q&A needs the guest-token
  // STOMP header before this can be enabled for them.
  useQaSocket(eventId, !isGuest);
  const { data: participantQData } = useGetQuestions(eventId, 30000, !isGuest);
  const { data: guestQData } = useGuestQuestions(eventId, guestToken, 10000, isGuest && !!guestToken);
  const qData = isGuest ? guestQData : participantQData;

  const { mutate: submitParticipantQ, isPending: submittingParticipantQ } = useSubmitQuestion(eventId);
  const { mutate: submitGuestQ, isPending: submittingGuestQ } = useGuestSubmitQuestion(eventId, guestToken);
  const submitQuestion = isGuest ? submitGuestQ : submitParticipantQ;
  const submittingQ = isGuest ? submittingGuestQ : submittingParticipantQ;

  const { mutate: upvoteParticipant } = useUpvoteQuestion(eventId);
  const { mutate: upvoteGuest } = useGuestUpvoteQuestion(eventId, guestToken);
  const upvote = (questionId: string) => {
    if (isGuest) {
      upvoteGuest(questionId);
    } else {
      upvoteParticipant(questionId);
    }
  };
  const apiQuestions = qData?.data?.questions ?? [];
  const qaItems = apiQuestions.map((x) => ({
    id: x.id,
    who: x.anonymous ? "Anonymous" : x.askerName || "Participant",
    submittedAt: x.submittedAt ?? null,
    text: x.content,
    answered: !!x.answer || (x.status || "").toUpperCase() === "ANSWERED",
    answer: x.answer || "",
    upvoteCount: x.upvoteCount ?? 0,
    myUpvote: !!x.myUpvote,
    status: (x.status || "PENDING").toUpperCase(),
  }));

  // Guests and proxies land straight in this room and never see the event detail page,
  // so the running order has to be reachable from here too. The guest /view payload is
  // typed as EventDetail but is known to diverge (it sends eventTitle, not title), so
  // read defensively and only offer the tab when data actually arrived.
  const agendaItems = (event as { agenda?: AgendaItemDetail[] } | undefined)?.agenda ?? [];
  const speakerItems = (event as { speakers?: SpeakerItem[] } | undefined)?.speakers ?? [];
  const hasAgenda = agendaItems.length > 0 || speakerItems.length > 0;

  const [tab, setTab] = useState<Tab>(showBallot ? "ballot" : "qa");
  const [pollChoice, setPollChoice] = useState<string | null>(null);
  const [pollMsg, setPollMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [vote, setVote] = useState<VoteChoice | null>(null);
  const [voteMsg, setVoteMsg] = useState<{ kind: "ok" | "err"; text: string; disclaimer?: string } | null>(null);
  const [isEditingVote, setIsEditingVote] = useState(false);
  // A success message next to the permanent "Vote Recorded" card is redundant clutter —
  // fade it on its own rather than needing the user to dismiss it or vote again to clear
  // it. Errors stay put; those need to actually be read and acted on.
  useEffect(() => {
    if (voteMsg?.kind !== "ok") return;
    const t = setTimeout(() => setVoteMsg(null), 4000);
    return () => clearTimeout(t);
  }, [voteMsg]);
  // The "Voting as proxy" banner is one-time orientation, not a persistent status — once
  // shown, it fades so it doesn't keep competing with the actual vote state below it.
  const [showProxyIntro, setShowProxyIntro] = useState(true);
  useEffect(() => {
    if (!guestCanVote) return;
    const t = setTimeout(() => setShowProxyIntro(false), 5000);
    return () => clearTimeout(t);
  }, [guestCanVote]);

  const [q, setQ] = useState("");
  const [qSent, setQSent] = useState(false);
  const [qSentAt, setQSentAt] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [videoHidden, setVideoHidden] = useState(false);
  // Reveal the Minimise button only while the pointer is over the video box, so it
  // never sits on top of (or blocks) Zoom's own controls.
  const [videoHover, setVideoHover] = useState(false);

  // Show the user's just-submitted question optimistically — but only until the
  // backend's list actually returns it (so it doesn't appear twice).
  const showMyPending =
    qSent &&
    userQuestion.trim().length > 0 &&
    !qaItems.some((i) => i.text.trim().toLowerCase() === userQuestion.trim().toLowerCase());

  // Remember the active tab so a refresh keeps you where you were.
  useEffect(() => {
    const saved = sessionStorage.getItem("attend:liveTab");
    if (
      saved === "qa" ||
      (!showBallot && saved === "poll") ||
      (showBallot && saved === "ballot") ||
      (isLaunch && saved === "presskit")
    )
      setTab(saved as Tab);
  }, [showBallot]);
  const selectTab = (t: Tab) => {
    setTab(t);
    try {
      sessionStorage.setItem("attend:liveTab", t);
    } catch {
      /* ignore storage errors */
    }
  };

  // Local "starts in" ticker — re-syncs to the backend's secondsUntilStart on
  // each poll, ticks down locally in between.
  const [startsIn, setStartsIn] = useState<number | null>(null);
  useEffect(() => {
    if (cdSecs == null) {
      setStartsIn(null);
      return;
    }
    setStartsIn(cdSecs);
    const t = setInterval(() => setStartsIn((s) => (s == null ? null : Math.max(0, s - 1))), 1000);
    return () => clearInterval(t);
  }, [cdSecs]);

  // Real countdown: re-sync to the open resolution's secondsRemaining on every
  // poll, tick down locally in between.
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

  // Pre-select the user's existing vote so they can review/change it in the window.
  // Also clear the last resolution's status message — hasRecorded ORs voteMsg?.kind
  // === "ok", so a stale success would otherwise flag the NEXT resolution as already
  // voted (showing "Vote Recorded" for a resolution the user hasn't voted on).
  useEffect(() => {
    setVote((openRes?.myVote as VoteChoice | null) ?? null);
    setIsEditingVote(false);
    setVoteMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRes?.id]);

  // Same reset for polls — a stale selection/message would otherwise carry into the
  // next poll and pre-highlight an unrelated option.
  useEffect(() => {
    setPollChoice(null);
    setPollMsg(null);
  }, [activePoll?.id]);

  function sendQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const text = q.trim();
    setUserQuestion(text);
    submitQuestion(
      { content: text, anonymous: false },
      {
        onSuccess: () => {
          setQSent(true);
          setQSentAt(new Date().toISOString());
          setQ("");
        },
      },
    );
  }

  // Shared success/error for the standard ballot, whether the caller is a voting
  // participant or a proxy guest.
  const voteHandlers = (okText: string, resId: string) => ({
    onSuccess: (res: any) => {
      // Only the guest/proxy vote endpoints carry this (added 2026-08-18) — undefined
      // for a regular participant vote, which is correct: the disclaimer is proxy-specific.
      const disclaimer = res?.data?.disclaimer || res?.disclaimer;
      setVoteMsg({ kind: "ok" as const, text: okText, disclaimer });
      setIsEditingVote(false);
      markVoted(resId);
    },
    onError: (err: any) => {
      setVoteMsg({
        kind: "err" as const,
        text:
          err?.response?.data?.message ||
          (err?.response?.status === 409
            ? "You've already voted on this resolution."
            : "Could not record your vote. Please try again."),
      });
    },
  });

  function handleCastVote() {
    if (!openRes || !vote) return;
    setVoteMsg(null);
    const args = { resolutionId: openRes.id, data: { choice: vote } };
    const h = voteHandlers("Your vote has been recorded.", openRes.id);
    // §11: a proxy guest votes via the guest endpoint (auth'd by X-Guest-Token, no code);
    // a participant via the participant endpoint.
    if (guestCanVote) guestVote(args, h);
    else castVote(args, h);
  }

  function handleCastCandidateVote(votes: { candidateId: string; choice: "FOR" | "AGAINST" | "ABSTAIN" }[]) {
    if (!openRes) return;
    setVoteMsg(null);
    const args = { resolutionId: openRes.id, data: { votes } };
    const h = voteHandlers("Your nominee ballot has been recorded.", openRes.id);
    if (guestCanVote) guestVote(args, h);
    else castVote(args, h);
  }

  function handleGuestProxyVoteChoice(choice: VoteChoice) {
    if (!openRes || !proxyCode.trim()) return;
    setVoteMsg(null);
    guestProxyVote(
      { resolutionId: openRes.id, proxyCode: proxyCode.trim(), data: { choice } },
      {
        onSuccess: (res: any) => {
          const disclaimer = res?.data?.disclaimer || res?.disclaimer;
          setVoteMsg({ kind: "ok", text: "Your proxy vote has been recorded.", disclaimer });
          setIsEditingVote(false);
          markVoted(openRes.id);
        },
        onError: (err: any) => {
          setVoteMsg({
            kind: "err",
            text: err?.response?.data?.message || "Could not record your proxy vote. Please verify your proxy code.",
          });
        },
      },
    );
  }

  function handleGuestProxyCandidateVote(votes: { candidateId: string; choice: "FOR" | "AGAINST" | "ABSTAIN" }[]) {
    if (!openRes || !proxyCode.trim()) return;
    setVoteMsg(null);
    guestProxyVote(
      { resolutionId: openRes.id, proxyCode: proxyCode.trim(), data: { votes } },
      {
        onSuccess: (res: any) => {
          const disclaimer = res?.data?.disclaimer || res?.disclaimer;
          setVoteMsg({ kind: "ok", text: "Your proxy candidate ballot has been recorded.", disclaimer });
          setIsEditingVote(false);
          markVoted(openRes.id);
        },
        onError: (err: any) => {
          setVoteMsg({
            kind: "err",
            text: err?.response?.data?.message || "Could not record your proxy candidate vote. Please verify your proxy code.",
          });
        },
      },
    );
  }

  // A badge for resolution state. Shown in the read-only guest ballot too — it is a statement of
  // where the resolution stands, not a prompt to act, and without it a guest cannot tell an open
  // resolution from a closed one. The "Voted X" branch never fires for a guest, who has no vote.
  function statusBadge(r: Resolution) {
    const v = (r.myVote || "").toUpperCase();
    const s = (r.status || "").toUpperCase();
    if (v) return { label: `Voted ${v.charAt(0) + v.slice(1).toLowerCase()}`, tone: "bg-emerald-100 text-emerald-700" };
    if (s === "OPEN") return { label: "Open", tone: "bg-amber-100 text-amber-700" };
    if (s === "CLOSED") return { label: "Closed", tone: "bg-slate-100 text-slate-600" };
    if (s === "WAITING") return { label: "Waiting", tone: "bg-slate-100 text-slate-600" };
    return { label: "Pending", tone: "bg-slate-100 text-slate-600" };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href={resolvedBackHref} className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground/60">
              Not live
            </span>
          )}
          {watching > 0 && (
            <span className="flex items-center gap-1 text-xs text-foreground/60">
              <Users className="h-3.5 w-3.5" />
              {watching.toLocaleString()} watching
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {brandLogo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={brandLogo}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-border"
            // A broken logo URL must not leave a torn-image icon in the header.
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="min-w-0">
          {organiser && (
            <p
              className="text-xs font-semibold uppercase tracking-wide text-primary"
              // Tint with the register's brand colour when set; fall back to the theme primary.
              style={brandColor ? { color: brandColor } : undefined}
            >
              {organiser}
            </p>
          )}
          <h1 className="text-xl font-bold text-foreground md:text-2xl">{title}</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Stream */}
        <div className="lg:col-span-3">
          {videoHidden && (
            <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span className="h-1 w-1 rounded-full bg-white" /> Live
                </span>
                <p className="text-sm font-semibold text-white line-clamp-1">{title}</p>
              </div>
              <button
                onClick={() => setVideoHidden(false)}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                <ChevronDown className="h-3.5 w-3.5" /> Expand
              </button>
            </div>
          )}
          {/* Stay mounted while minimised. Unmounting ZoomStage runs its cleanup,
              which calls leaveMeeting() — that would drop you out of the meeting. */}
          <div
            onMouseEnter={() => setVideoHover(true)}
            onMouseLeave={() => setVideoHover(false)}
            className={cn(
              "relative overflow-hidden rounded-xl bg-slate-900",
              !zoom && "aspect-video",
              videoHidden && "hidden",
            )}
          >
              {zoom ? (
                coiState === "ready" ? (
                  <ZoomStage
                    eventId={eventId}
                    meetingNumber={zoom.meetingNumber}
                    passcode={zoom.passcode}
                    userName={displayName}
                  />
                ) : (
                  // Isolating (a one-time reload). Don't load the Zoom SDK yet.
                  <div className="flex min-h-105 w-full flex-col items-center justify-center gap-3 text-white">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
                    <p className="text-sm font-semibold text-white/85">Preparing the meeting…</p>
                  </div>
                )
              ) : streamUrl ? (
                <iframe
                  // `credentialless` lets this cross-origin embed load inside our
                  // COEP (cross-origin isolated) page — otherwise COEP blocks it.
                  // See the headers() block in next.config.ts.
                  {...({ credentialless: "" } as any)}
                  src={toEmbedUrl(streamUrl)}
                  title={title}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_40%)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                      {startsIn != null && startsIn > 0 ? (
                        <Clock className="h-7 w-7 text-white/70" />
                      ) : (
                        <Play className="h-7 w-7 text-white/70" />
                      )}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white/85">
                      {startsIn != null && startsIn > 0
                        ? `Starts in ${fmtCountdown(startsIn)}`
                        : isLive
                        ? "The organiser hasn't posted a join link yet — check back shortly."
                        : "The live stream will appear here once the session begins"}
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={() => setVideoHidden(true)}
                className={cn(
                  "absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:bg-black/60",
                  videoHover ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <ChevronUp className="h-3.5 w-3.5" /> Minimise
              </button>
          </div>

          {/* Countdown strip — driven by the open resolution's secondsRemaining (AGM only).
              Hidden in the read-only guest ballot: "Voting open · 30s remaining" is a call
              to act, and the guest has nothing to act with. */}
          {showBallot && openRes && !ballotReadOnly && (
            <div
              className={cn(
                "mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors",
                countdown <= 10 ? "bg-red-600" : "bg-amber-500",
              )}
            >
              <Vote className="h-4 w-4 shrink-0 text-white" />
              <p className="text-sm font-semibold text-white">
                Voting open · Resolution {openPos ?? "—"}
                {countdown > 0 ? ` · ${countdown}s remaining` : ""}
              </p>
            </div>
          )}

          {/* Also hidden for read-only guests: Quorum is a participant-only endpoint (so it
              renders "—" for them), and the Status cell is the "Waiting"/"Open" badge again. */}
          {showBallot && !ballotReadOnly && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-center">
                <p className="text-xs text-foreground/60">Quorum</p>
                <p className="text-base font-semibold text-foreground">
                  {quorumPct != null ? `${quorumPct}%` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-center">
                <p className="text-xs text-foreground/60">Resolution</p>
                <p className="text-base font-semibold text-foreground">
                  {openPos ?? "—"} of {resolutions.length || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-center">
                <p className="text-xs text-foreground/60">Status</p>
                <p className="text-base font-semibold text-foreground">{ballotStatus}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            <div className="flex border-b border-foreground/[0.06]">
              {[
                { id: "qa" as Tab, label: "Q&A", icon: MessageSquare },
                ...(hasAgenda ? [{ id: "agenda" as Tab, label: "Agenda", icon: CalendarDays }] : []),
                ...(isLaunch ? [{ id: "presskit" as Tab, label: "Press Kit", icon: FileBox }] : []),
                ...(showBallot ? [{ id: "ballot" as Tab, label: "Ballot", icon: Vote }] : []),
                ...(!showBallot ? [{ id: "poll" as Tab, label: "Polls", icon: BarChart2 }] : []),
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold",
                    tab === id ? "border-b-2 border-primary text-primary" : "text-foreground/60",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="max-h-105 overflow-y-auto p-4">
              {tab === "agenda" && (
                <div className="flex flex-col gap-3">
                  <AgendaPanel speakers={speakerItems} agenda={agendaItems} />
                </div>
              )}

              {tab === "qa" && (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                    Submitted Questions
                  </p>
                  <ul className="space-y-2">
                    {qaItems.map((item) => (
                      <li key={item.id} className="rounded-xl border border-foreground/[0.06] bg-white p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-foreground">{item.who}</p>
                          <div className="flex items-center gap-2">
                            {item.answered && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                <CheckCircle className="h-3 w-3" /> Addressed
                              </span>
                            )}
                            {item.submittedAt && (
                              <p className="text-[11px] text-foreground/60">
                                <RelativeTimeLabel timestamp={item.submittedAt} />
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                        {item.answer && (
                          <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
                            <span className="font-semibold">Answer: </span>
                            {item.answer}
                          </div>
                        )}
                        {!isGuest && (item.status === "APPROVED" || item.status === "ANSWERED") ? (
                          <div className="mt-2 flex items-center">
                            <button
                              type="button"
                              onClick={() => upvote(item.id)}
                              aria-pressed={item.myUpvote}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                                item.myUpvote
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.04]",
                              )}
                            >
                              <ThumbsUp className={cn("h-3.5 w-3.5", item.myUpvote && "fill-current")} />
                              {item.upvoteCount}
                            </button>
                          </div>
                        ) : item.status === "APPROVED" || item.status === "ANSWERED" ? (
                          <div className="mt-2 flex items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/[0.06] bg-foreground/[0.03] px-2.5 py-1 text-[11px] font-medium text-foreground/60">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {item.upvoteCount} upvotes
                            </span>
                          </div>
                        ) : item.status === "PENDING" ? (
                          <div className="mt-2 flex items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/[0.06] bg-foreground/[0.03] px-2.5 py-1 text-[11px] font-medium text-foreground/60">
                              <Clock className="h-3 w-3" />
                              Pending Approval
                            </span>
                          </div>
                        ) : null}
                      </li>
                    ))}
                    {showMyPending && (
                      <li className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-primary">You</p>
                          <p className="text-[11px] text-foreground/60">
                            <RelativeTimeLabel timestamp={qSentAt} fallback="just now" /> · Pending review
                          </p>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{userQuestion}</p>
                      </li>
                    )}
                  </ul>
                  <p className="text-xs text-foreground/60">
                    Questions are reviewed by the moderator before being shown to the Chair.
                  </p>
                  {!canSubmitQA ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Q&A submissions are disabled for your current role.
                    </div>
                  ) : (
                    <form onSubmit={sendQuestion} className="flex gap-2">
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Submit a question..."
                        className="h-10 flex-1 rounded-xl border border-transparent bg-foreground/[0.04] px-3 text-sm outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:bg-white"
                      />
                      <Button type="submit" size="sm" loading={submittingQ} disabled={!q.trim()} className="bg-slate-900 hover:bg-slate-800">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                  {qSent && (
                    <p className="text-xs text-emerald-700">Your question was submitted for review.</p>
                  )}
                </div>
              )}

              {showBallot &&
                tab === "ballot" &&
                (ballotReadOnly ? (
                  /* Read-only guest ballot. As of 2026-08-17 backend hard-blocks resolution
                     data for non-proxy guests (403), so sortedRes is always empty for a plain
                     guest now — this used to show live tallies too, but the proxy-code entry
                     point below must stay reachable regardless, since it's the only route from
                     guest to voter and used to live nested inside the now-unreachable
                     sortedRes.length > 0 branch. */
                  <div className="space-y-2">
                    {sortedRes.length > 0 ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                          Resolutions
                        </p>
                        {sortedRes.map((r, idx) => {
                          const showResult = r.forCount + r.againstCount + r.abstainCount > 0;
                          const { label, tone } = statusBadge(r);
                          return (
                            <div key={r.id} className="rounded-xl border border-foreground/[0.06] p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[11px] text-foreground/60">Resolution {idx + 1}</p>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    tone,
                                  )}
                                >
                                  {label}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground">{r.title}</p>
                              {r.description && (
                                <p className="mt-1 text-xs text-foreground/60">{r.description}</p>
                              )}
                              {r.candidates && r.candidates.length > 0 ? (
                                <div className="mt-3 space-y-2 border-t border-foreground/[0.06] pt-2">
                                  {r.candidates.map((c) => (
                                    <div key={c.id}>
                                      <p className="text-xs font-medium text-foreground">{c.name}</p>
                                      <CandidateTally candidate={c} />
                                    </div>
                                  ))}
                                </div>
                              ) : showResult ? (
                                <div className="mt-3 space-y-3 border-t border-foreground/[0.06] pt-2">
                                  <ResolutionBars r={r} />
                                  {r.bySource && <SourceBreakdown bySource={r.bySource} />}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="py-8 text-center text-sm text-foreground/60">
                        Resolution details are only visible to shareholders and their appointed
                        proxies.
                      </div>
                    )}

                    <p className="pt-1 text-[11px] text-foreground/60">
                      You&apos;re viewing this meeting as a guest.
                      {sortedRes.length > 0 &&
                        " Results update live; voting is open to shareholders and their appointed proxies."}
                    </p>

                    {/* The only route from guest to voter. Collapsed by default so it isn't
                        an invitation, but reachable for someone actually holding a code. */}
                    {!showProxyEntry ? (
                        <button
                          type="button"
                          onClick={() => setShowProxyEntry(true)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          I have a proxy code
                        </button>
                      ) : (
                        <div className="space-y-2 rounded-xl border border-foreground/[0.06] bg-slate-50/70 p-3.5">
                          <div>
                            <p className="text-xs font-semibold text-foreground">Proxy code</p>
                            <p className="text-[11px] text-foreground/60">
                              Enter the 10-digit code given to you by a shareholder to vote on
                              their behalf.
                            </p>
                          </div>
                          <input
                            className="w-full rounded-xl border border-foreground/[0.06] bg-white px-3 py-2 font-mono text-xs tracking-widest outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            placeholder="e.g. 0417382951"
                            maxLength={10}
                            value={proxyCode}
                            onChange={(e) => setProxyCode(e.target.value)}
                          />
                          {voteMsg && (
                            <div
                              className={cn(
                                "rounded-xl border px-3 py-2 text-xs font-medium",
                                voteMsg.kind === "ok"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-red-200 bg-red-50 text-red-600",
                              )}
                            >
                              {voteMsg.text}
                              {voteMsg.disclaimer && (
                                <p className="mt-1 font-normal text-emerald-700/80">{voteMsg.disclaimer}</p>
                              )}
                            </div>
                          )}
                          {/* Only an open resolution can take a proxy vote. */}
                          {openRes ? (
                            <>
                              <p className="text-[11px] font-medium text-foreground">
                                Voting on Resolution {openPos}: {openRes.title}
                              </p>
                              {openRes.candidates && openRes.candidates.length > 0 ? (
                                <NomineeBallot
                                  candidates={openRes.candidates}
                                  title={openRes.title}
                                  onVoteCast={handleGuestProxyCandidateVote}
                                  isPending={guestProxyVoting || proxyCode.trim().length !== 10}
                                />
                              ) : (
                                <div className="grid grid-cols-3 gap-2">
                                  {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((opt) => {
                                    const Icon = opt === "FOR" ? Check : opt === "AGAINST" ? X : Minus;
                                    const tone =
                                      opt === "FOR"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                        : opt === "AGAINST"
                                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                        : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";
                                    return (
                                      <button
                                        key={opt}
                                        disabled={proxyCode.trim().length !== 10 || guestProxyVoting}
                                        onClick={() => handleGuestProxyVoteChoice(opt)}
                                        className={cn(
                                          "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold capitalize transition-colors disabled:opacity-40",
                                          tone,
                                        )}
                                      >
                                        <Icon className="h-3.5 w-3.5" />
                                        {opt.charAt(0) + opt.slice(1).toLowerCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-foreground/60">
                              No resolution is open for voting right now.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                : openRes ? (
                  <div className="space-y-4">
                    {advanceNote && (
                      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> {advanceNote}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Resolution {openPos}
                        </p>
                        {/* Only appears when more than one resolution is open at once —
                            steps between them without crowding the single-open case. */}
                        {openResolutions.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={gotoPrevOpen}
                              disabled={!hasPrevOpen}
                              aria-label="Previous open resolution"
                              className="rounded-md border border-foreground/[0.06] p-1 text-foreground/60 transition-colors hover:bg-foreground/[0.04] disabled:opacity-30"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[10px] font-medium text-foreground/60">
                              {openIdx + 1}/{openResolutions.length} open
                            </span>
                            <button
                              type="button"
                              onClick={gotoNextOpen}
                              disabled={!hasNextOpen}
                              aria-label="Next open resolution"
                              className="rounded-md border border-foreground/[0.06] p-1 text-foreground/60 transition-colors hover:bg-foreground/[0.04] disabled:opacity-30"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 className="mt-0.5 text-base font-semibold text-foreground">
                        {openRes.title}
                      </h3>
                      <p className="mt-1 text-xs text-foreground/60">
                        {openRes.description}
                      </p>
                    </div>

                    {guestCanVote && showProxyIntro ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <p className="font-semibold">Voting as proxy</p>
                        <p className="mt-0.5 text-[11px] text-emerald-700/80">
                          You&apos;re signed in with a proxy code and can vote on the shareholder&apos;s behalf.
                        </p>
                      </div>
                    ) : !canVote && !isGuest ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-1">
                        <p className="font-semibold">Voting Restricted</p>
                        <p className="text-[11px] text-amber-700/80">
                          Your current role does not have voting privileges for this event.
                        </p>
                      </div>
                    ) : hasProxy ? (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
                        <p className="font-semibold">Voting managed by proxy</p>
                        <p className="mt-0.5 text-[11px] text-purple-700/80">
                          You have appointed a proxy to vote on your behalf at this meeting.
                        </p>
                      </div>
                    ) : null}

                    {voteMsg && (
                      <div
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-sm font-medium",
                          voteMsg.kind === "ok"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-600",
                        )}
                      >
                        {voteMsg.text}
                      </div>
                    )}

                    {(() => {
                      // myVote isn't reliably present on the guest resolutions response
                      // (confirmed 2026-08-17), and voteMsg now clears itself after a few
                      // seconds — locallyVoted is the one signal that's actually set on
                      // every successful cast and never auto-clears, so it's what keeps
                      // this card up rather than reverting to the vote UI once the other
                      // two go away.
                      const hasRecorded =
                        !!openRes.myVote || locallyVoted.has(openRes.id) || voteMsg?.kind === "ok";
                      const recordedChoice = (openRes.myVote || "").toUpperCase();
                      const resolutionIsOpen = openRes.secondsRemaining > 0 || (openRes.status || "").toUpperCase() === "OPEN";

                      if (hasRecorded && !isEditingVote) {
                        return (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-emerald-950">Vote Recorded</p>
                                  <p className="text-[11px] text-emerald-700 truncate">
                                    {recordedChoice ? `Selected choice: ${recordedChoice}` : "Your ballot vote has been saved."}
                                  </p>
                                </div>
                              </div>
                              {resolutionIsOpen && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditingVote(true)}
                                  className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
                                >
                                  Change vote
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          {isEditingVote && resolutionIsOpen && (
                            <div className="flex items-center justify-between text-xs text-foreground/60 pb-1">
                              <span>Updating your vote</span>
                              <button
                                type="button"
                                onClick={() => setIsEditingVote(false)}
                                className="font-semibold text-primary hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {(canVote || guestCanVote) && !hasProxy && openRes.candidates && openRes.candidates.length > 0 ? (
                            <NomineeBallot
                              candidates={openRes.candidates}
                              title={openRes.title}
                              onVoteCast={handleCastCandidateVote}
                              isPending={castPending}
                            />
                          ) : (canVote || guestCanVote) && !hasProxy ? (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((opt) => {
                                  const selected = vote === opt;
                                  const Icon = opt === "FOR" ? Check : opt === "AGAINST" ? X : Minus;
                                  const tone =
                                    opt === "FOR"
                                      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                      : opt === "AGAINST"
                                      ? "border-red-200 text-red-700 hover:bg-red-50"
                                      : "border-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.04]";
                                  const selectedTone =
                                    opt === "FOR"
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : opt === "AGAINST"
                                      ? "bg-red-600 text-white border-red-600"
                                      : "bg-slate-700 text-white border-slate-700";
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => setVote(opt)}
                                      disabled={castPending}
                                      className={cn(
                                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold capitalize transition-colors disabled:opacity-50",
                                        selected ? selectedTone : tone,
                                      )}
                                    >
                                      <Icon className="h-4 w-4" />
                                      {opt.charAt(0) + opt.slice(1).toLowerCase()}
                                    </button>
                                  );
                                })}
                              </div>
                              <Button fullWidth disabled={!vote || castPending} loading={castPending} onClick={handleCastVote}>
                                {vote ? `Cast vote: ${vote.charAt(0) + vote.slice(1).toLowerCase()}` : "Choose an option"}
                              </Button>
                            </>
                          ) : isGuest && !guestCanVote ? (
                            <div className="rounded-xl border border-foreground/[0.06] bg-slate-50/70 p-3.5 space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-foreground">Have a proxy code?</p>
                                <p className="text-[11px] text-foreground/60">Enter the 10-digit code given to you by a shareholder to cast a vote on their behalf.</p>
                              </div>
                              <input
                                className="w-full rounded-xl border border-foreground/[0.06] bg-white px-3 py-2 text-xs font-mono tracking-widest outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                placeholder="e.g. 0417382951"
                                maxLength={10}
                                value={proxyCode}
                                onChange={(e) => setProxyCode(e.target.value)}
                              />
                              {openRes.candidates && openRes.candidates.length > 0 ? (
                                <NomineeBallot
                                  candidates={openRes.candidates}
                                  title={openRes.title}
                                  onVoteCast={handleGuestProxyCandidateVote}
                                  isPending={guestProxyVoting || proxyCode.trim().length !== 10}
                                />
                              ) : (
                                <div className="grid grid-cols-3 gap-2">
                                  {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((opt) => {
                                    const Icon = opt === "FOR" ? Check : opt === "AGAINST" ? X : Minus;
                                    const tone =
                                      opt === "FOR"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                        : opt === "AGAINST"
                                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                        : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";
                                    return (
                                      <button
                                        key={opt}
                                        disabled={proxyCode.trim().length !== 10 || guestProxyVoting}
                                        onClick={() => handleGuestProxyVoteChoice(opt)}
                                        className={cn(
                                          "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold capitalize transition-colors disabled:opacity-40",
                                          tone
                                        )}
                                      >
                                        <Icon className="h-3.5 w-3.5" />
                                        {opt.charAt(0) + opt.slice(1).toLowerCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}

                    {openRes.forCount + openRes.againstCount + openRes.abstainCount > 0 && (
                      <div className="border-t border-foreground/[0.06] pt-3 space-y-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live tally
                        </p>
                        <ResolutionBars r={openRes} />
                        {openRes.bySource && <SourceBreakdown bySource={openRes.bySource} />}
                      </div>
                    )}
                  </div>
                ) : sortedRes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                      {allClosed ? "Results" : "Resolutions"}
                    </p>
                    {sortedRes.map((r, idx) => {
                      const { label, tone } = statusBadge(r);
                      // Show the tally as soon as any vote exists, not only once the
                      // resolution closes — a proxy/guest watching the ballot should see
                      // the count move live, the same as the open-resolution panel does.
                      const showResult = r.forCount + r.againstCount + r.abstainCount > 0;
                      return (
                        <div key={r.id} className="rounded-xl border border-foreground/[0.06] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-foreground/60">Resolution {idx + 1}</p>
                              <p className="text-sm font-medium text-foreground">{r.title}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                          </div>
                          {/* Candidate resolutions keep the flat counts at 0 — every tally
                              lives on the candidates themselves, so render those instead. */}
                          {r.candidates && r.candidates.length > 0 ? (
                            <div className="mt-3 space-y-2 border-t border-foreground/[0.06] pt-2">
                              {r.candidates.map((c) => (
                                <div key={c.id}>
                                  <p className="text-xs font-medium text-foreground">{c.name}</p>
                                  <CandidateTally candidate={c} />
                                </div>
                              ))}
                            </div>
                          ) : showResult ? (
                            <div className="mt-3 border-t border-foreground/[0.06] pt-2 space-y-3">
                              <ResolutionBars r={r} />
                              {r.bySource && <SourceBreakdown bySource={r.bySource} />}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-foreground/60">
                    No resolutions for this meeting yet.
                  </div>
                ))}
              
              {tab === "poll" && (
                <div className="space-y-4">
                  {!activePoll ? (
                    <div className="py-8 text-center text-sm text-foreground/60">
                      No active poll at the moment.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                      <div className="mb-4">
                        <span className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                          Live Poll
                        </span>
                        <h3 className="mt-2 text-base font-semibold text-foreground">
                          {activePoll.question}
                        </h3>
                      </div>
                      
                      {pollMsg && (
                        <div className={cn(
                          "mb-4 rounded-xl border px-3 py-2.5 text-sm font-medium",
                          pollMsg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"
                        )}>
                          {pollMsg.text}
                        </div>
                      )}

                      <div className="space-y-2">
                        {activePoll.options.map((opt) => {
                          const isSelected = pollChoice === opt.id || activePoll.myResponse === opt.id;
                          return (
                            <button
                              key={opt.id}
                              disabled={!!activePoll.myResponse || submittingPoll}
                              onClick={() => setPollChoice(opt.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors disabled:opacity-75",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-foreground/[0.06] hover:border-primary/50 hover:bg-foreground/[0.04]"
                              )}
                            >
                              <span className="text-sm font-medium text-foreground">{opt.text}</span>
                              {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>

                      {!activePoll.myResponse && (
                        <Button
                          fullWidth
                          className="mt-4"
                          disabled={!pollChoice || submittingPoll}
                          loading={submittingPoll}
                          onClick={() => {
                            if (!pollChoice) return;
                            respondToPoll(
                              { pollId: activePoll.id, optionId: pollChoice },
                              {
                                onSuccess: () => {
                                  setPollMsg({ kind: "ok", text: "Your response has been recorded." });
                                },
                                onError: () => {
                                  setPollMsg({ kind: "err", text: "Failed to submit response. Please try again." });
                                },
                              }
                            );
                          }}
                        >
                          Submit Response
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === "presskit" && (
                <div className="space-y-3">
                  {pressKitForbidden ? (
                    <div className="py-8 text-center text-sm text-foreground/60">
                      You must be registered for this event to view the press kit.
                    </div>
                  ) : !pressKit || pressKit.totalCount === 0 ? (
                    <div className="py-8 text-center text-sm text-foreground/60">
                      No press kit files have been released yet.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Digital Press Kit</h3>
                        <span className="rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-semibold text-foreground/60">
                          {pressKit.releasedCount} / {pressKit.totalCount} released
                        </span>
                      </div>
                      <div className="space-y-2">
                        {pressKit.files.map((file) => {
                          const isReleased = file.status === "RELEASED";
                          const name = fileDisplayName(file);
                          return (
                            <div
                              key={file.id}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-xl border p-3",
                                isReleased ? "border-primary/20 bg-primary/5" : "border-foreground/[0.06] bg-white opacity-60",
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                    isReleased ? "bg-primary/10 text-primary" : "bg-foreground/[0.04] text-foreground/60",
                                  )}
                                >
                                  <FileBox className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground" title={name}>
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
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                                >
                                  <DownloadCloud className="h-3.5 w-3.5" /> Download
                                </a>
                              ) : (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                  <Clock className="h-3 w-3" /> Embargoed
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResolutionBars({ r }: { r: Resolution }) {
  const totalShares = r.forShares + r.againstShares + r.abstainShares;
  const totalCount = r.forCount + r.againstCount + r.abstainCount;
  // AGM votes are weighted by shareholding, so the share figure is always shown — including
  // when it's 0, which tells the viewer the register carries no weighting rather than
  // silently dropping the column. Percentages fall back to head counts in that case.
  const useShares = totalShares > 0;
  const denom = useShares ? totalShares : totalCount;
  const pct = (count: number, shares: number) =>
    denom ? Math.round(((useShares ? shares : count) / denom) * 100) : 0;
  const rows = [
    { label: "For", count: r.forCount, shares: r.forShares, color: "bg-emerald-500" },
    { label: "Against", count: r.againstCount, shares: r.againstShares, color: "bg-red-500" },
    { label: "Abstain", count: r.abstainCount, shares: r.abstainShares, color: "bg-slate-400" },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-0.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-foreground/60">
                {row.count} · {row.shares.toLocaleString()} shares · {pct(row.count, row.shares)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.04]">
              <div className={`${row.color} h-full`} style={{ width: `${pct(row.count, row.shares)}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}

/** Inline component that renders a live-updating relative time label (e.g. "2 mins ago"). */
function RelativeTimeLabel({
  timestamp,
  fallback = "",
}: {
  timestamp: string | null | undefined;
  fallback?: string;
}) {
  const label = useRelativeTime(timestamp);
  return <>{label || fallback}</>;
}
