"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Users,
  Vote,
  Send,
  Check,
  X,
  Minus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ThumbsUp,
  Clock,
  FileBox,
  DownloadCloud,
} from "lucide-react";
import { useGetEvent, useGetStream, useGetCountdown, useGetQuorum, useGetActivePoll, useRespondToPoll, useGetPressKit } from "@/api/events/hooks";
import { useGetMe } from "@/api/auth/hooks";
import { ZoomStage } from "@/components/attend/ZoomStage";
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
import { cn, formatRelativeTime, toEmbedUrl, fileDisplayName } from "@/lib/utils";
import { Resolution } from "@/types";
import { NomineeBallot } from "@/components/attend/NomineeBallot";
import { SourceBreakdown } from "@/components/attend/SourceBreakdown";

type Tab = "qa" | "ballot" | "poll" | "presskit";
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
  backHref = "/agm",
  backLabel = "Leave meeting",
  zoomOverride,
}: LiveRoomProps) {
  const { data: eventResp } = useGetEvent(eventId);
  const event = eventResp?.data;
  const title = event?.title ?? "Live session";
  const organiser = event?.registerName || event?.organizerName || "";
  const watching = event?.registeredCount ?? 0;
  const isLive = event?.status === "LIVE";

  // Stream link: prefer the gated /stream endpoint (only resolves when live +
  // registered); fall back to the streamUrl the admin set on the event.
  const { data: streamData } = useGetStream(eventId, isLive);
  const streamUrl = (streamData?.data?.streamUrl as string) || event?.streamUrl || "";
  // If the stream is a Zoom meeting we render the Zoom SDK; otherwise the iframe.
  // A zoomOverride (test-only) takes precedence over the event's streamUrl.
  const zoom = zoomOverride?.meetingNumber ? zoomOverride : parseZoomUrl(streamUrl);
  const { data: meResp } = useGetMe();
  const displayName = meResp?.data?.fullName || "Participant";

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
  const { data: cdData } = useGetCountdown(eventId, !!event && !isLive);
  const cdSecs =
    typeof cdData?.data?.secondsUntilStart === "number" ? cdData.data.secondsUntilStart : null;

  // Live quorum (AGM ballot only). Response is a generic map — read the percentage
  // defensively; show "—" rather than a fabricated number if it's not present.
  const { data: quorumData } = useGetQuorum(eventId, showBallot && isLive);
  const quorumPct = (() => {
    const m = (quorumData?.data ?? {}) as Record<string, unknown>;
    const raw =
      m.quorumPercentage ?? m.percentage ?? m.currentPercentage ?? m.presentPercentage ?? m.attendancePercentage;
    return typeof raw === "number" ? Math.round(raw) : null;
  })();

  // Only AGMs poll resolutions for the live ballot.
  const { data: resData } = useGetResolutions(eventId, showBallot ? 5000 : undefined, showBallot);
  const { mutate: castVote, isPending: voting } = useCastVote(eventId);
  const { mutate: upvote } = useUpvoteQuestion(eventId);

  const resolutions = resData?.data?.resolutions ?? [];
  const hasProxy = !!resData?.data?.hasProxy;

  const { data: pollResp } = useGetActivePoll(eventId, !showBallot && isLive ? 5000 : undefined, !showBallot && isLive);
  const { mutate: respondToPoll, isPending: submittingPoll } = useRespondToPoll(eventId);
  const activePoll = pollResp?.data;

  // Press Kit — product launches only. Poll while live so files flip to "released"
  // as the organiser releases them.
  const isLaunch = event?.eventType === "PRODUCT_LAUNCH";
  const { data: pressKitResp, error: pressKitError } = useGetPressKit(eventId, isLaunch && isLive ? 10000 : undefined, isLaunch);
  const pressKit = pressKitResp?.data;
  // 403 → the participant isn't registered for this event (press kit is gated).
  const pressKitForbidden =
    (pressKitError as { response?: { status?: number } } | null)?.response?.status === 403;

  // When the register has no share weighting, shares are all 0 — show head counts only.
  const shareWeighted = !!resData?.data?.shareWeightedTalliesEnabled;
  // Status-driven (secondsRemaining is null while a resolution is WAITING).
  const openRes = resolutions.find(
    (r) => (r.status || "").toUpperCase() === "OPEN" || r.secondsRemaining > 0,
  );
  const allClosed =
    resolutions.length > 0 && resolutions.every((r) => (r.status || "").toUpperCase() === "CLOSED");
  // Open while a resolution is live, Closed only when every one has closed,
  // otherwise Waiting (resolutions exist but none has been opened yet).
  const ballotStatus = openRes ? "Open" : allClosed ? "Closed" : resolutions.length ? "Waiting" : "—";
  // Stable 1-based numbering by position — resolution.order isn't reliably 0-based,
  // which is what produced "6 of 5". Number by index so the count always tallies.
  const sortedRes = [...resolutions].sort((a, b) => a.order - b.order);
  const openPos = openRes ? sortedRes.findIndex((r) => r.id === openRes.id) + 1 : null;

  // Real-time Q&A over WebSocket; polling stays as a slow (30s) fallback.
  useQaSocket(eventId);
  const { data: qData } = useGetQuestions(eventId, 30000);
  const { mutate: submitQuestion, isPending: submittingQ } = useSubmitQuestion(eventId);
  const apiQuestions = qData?.data?.questions ?? [];
  const qaItems = apiQuestions.map((x) => ({
    id: x.id,
    who: x.anonymous ? "Anonymous" : x.askerName || "Participant",
    time: x.submittedAt ? formatRelativeTime(x.submittedAt) : "",
    text: x.content,
    answered: !!x.answer || (x.status || "").toUpperCase() === "ANSWERED",
    answer: x.answer || "",
    upvoteCount: x.upvoteCount ?? 0,
    myUpvote: !!x.myUpvote,
    status: (x.status || "PENDING").toUpperCase(),
  }));

  const [tab, setTab] = useState<Tab>(showBallot ? "ballot" : "qa");
  const [pollChoice, setPollChoice] = useState<string | null>(null);
  const [pollMsg, setPollMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [vote, setVote] = useState<VoteChoice | null>(null);
  const [voteMsg, setVoteMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [q, setQ] = useState("");
  const [qSent, setQSent] = useState(false);
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
  useEffect(() => {
    setVote((openRes?.myVote as VoteChoice | null) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRes?.id]);

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
          setQ("");
        },
      },
    );
  }

  function handleCastVote() {
    if (!openRes || !vote) return;
    setVoteMsg(null);
    castVote(
      { resolutionId: openRes.id, data: { choice: vote } },
      {
        onSuccess: () => {
          setVoteMsg({ kind: "ok", text: "Your vote has been recorded." });
          setVote(null);
        },
        onError: (err: any) => {
          const status = err?.response?.status;
          setVoteMsg({
            kind: "err",
            text:
              status === 409
                ? "You've already voted on this resolution."
                : err?.response?.data?.message || "Could not record your vote. Please try again.",
          });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground/50">
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

      <div>
        {organiser && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{organiser}</p>
        )}
        <h1 className="text-xl font-medium tracking-[-0.6px] text-foreground md:text-2xl md:tracking-[-0.72px]">{title}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Stream */}
        <div className="lg:col-span-3">
          {videoHidden && (
            <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3">
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
              "relative overflow-hidden rounded-2xl bg-slate-900",
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
                        ? "Waiting for the live stream…"
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

          {/* Countdown strip — driven by the open resolution's secondsRemaining (AGM only) */}
          {showBallot && openRes && (
            <div
              className={cn(
                "mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors",
                countdown <= 10 ? "bg-red-600" : "bg-primary",
              )}
            >
              <Vote className="h-4 w-4 shrink-0 text-white" />
              <p className="text-sm font-medium tracking-[-0.14px] text-white">
                Voting open · Resolution {openRes.order + 1}
                {countdown > 0 ? ` · ${countdown}s remaining` : ""}
              </p>
            </div>
          )}

          {showBallot && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-center">
                <p className="text-xs text-foreground/60">Quorum</p>
                <p className="text-base font-medium tracking-[-0.32px] text-foreground">
                  {quorumPct != null ? `${quorumPct}%` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-center">
                <p className="text-xs text-foreground/60">Resolution</p>
                <p className="text-base font-medium tracking-[-0.32px] text-foreground">
                  {openPos ?? "—"} of {resolutions.length || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-center">
                <p className="text-xs text-foreground/60">Status</p>
                <p className="text-base font-medium tracking-[-0.32px] text-foreground">{ballotStatus}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            <div className="flex border-b border-foreground/10">
              {[
                { id: "qa" as Tab, label: "Q&A" },
                ...(isLaunch ? [{ id: "presskit" as Tab, label: "Press Kit" }] : []),
                ...(showBallot ? [{ id: "ballot" as Tab, label: "Resolution" }] : []),
                ...(!showBallot ? [{ id: "poll" as Tab, label: "Polls" }] : []),
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={cn(
                    "flex-1 border-b-2 px-2 py-3 text-sm tracking-[-0.14px] transition-colors",
                    tab === id
                      ? "border-foreground font-semibold text-foreground"
                      : "border-transparent text-foreground/60 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-105 overflow-y-auto p-4">
              {tab === "qa" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-foreground/60">
                    Questions are reviewed by the moderator before being shown to the Chair.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {qaItems.map((item) => (
                      <li key={item.id} className="rounded-xl border border-foreground/[0.06] bg-white p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground">{item.who}</p>
                          <div className="flex items-center gap-2">
                            {item.answered && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                                <CheckCircle className="h-3 w-3" /> Addressed
                              </span>
                            )}
                            {item.time && <p className="text-[11px] text-foreground/50">{item.time}</p>}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{item.text}</p>
                        {item.answer && (
                          <div className="mt-2 rounded-lg bg-primary/5 p-2 text-xs text-primary">
                            <span className="font-semibold">Answer: </span>
                            {item.answer}
                          </div>
                        )}
                        {item.status === "APPROVED" || item.status === "ANSWERED" ? (
                          <div className="mt-2 flex items-center">
                            <button
                              type="button"
                              onClick={() => upvote(item.id)}
                              aria-pressed={item.myUpvote}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                                item.myUpvote
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground/15 text-foreground/60 hover:bg-foreground/5",
                              )}
                            >
                              <ThumbsUp className={cn("h-3.5 w-3.5", item.myUpvote && "fill-current")} />
                              {item.upvoteCount}
                            </button>
                          </div>
                        ) : item.status === "PENDING" ? (
                          <div className="mt-2 flex items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-foreground/50">
                              <Clock className="h-3 w-3" />
                              Pending Approval
                            </span>
                          </div>
                        ) : null}
                      </li>
                    ))}
                    {showMyPending && (
                      <li className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-primary">You</p>
                          <p className="text-[11px] text-foreground/50">Just now · Pending review</p>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{userQuestion}</p>
                      </li>
                    )}
                  </ul>
                  <form onSubmit={sendQuestion} className="flex flex-col gap-2">
                    <textarea
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Type your question"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-transparent bg-foreground/[0.04] px-3.5 py-3 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 focus-visible:border-primary focus-visible:outline-none"
                    />
                    <Button type="submit" size="lg" fullWidth loading={submittingQ} disabled={!q.trim()}>
                      <Send className="h-4 w-4" /> Send
                    </Button>
                  </form>
                  {qSent && (
                    <p className="text-xs text-primary">Your question was submitted for review.</p>
                  )}
                </div>
              )}

              {showBallot &&
                tab === "ballot" &&
                (openRes ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm text-foreground/50">
                        Resolution {openPos}
                      </p>
                      <h3 className="mt-0.5 text-sm font-medium tracking-[-0.14px] text-foreground">
                        {openRes.title}
                      </h3>
                      <p className="mt-1 text-xs text-foreground/60">
                        {openRes.description}
                      </p>
                    </div>

                    {hasProxy && (
                      <div className="rounded-xl bg-foreground/[0.03] px-3 py-2.5 text-xs text-foreground/70">
                        <p className="font-medium text-foreground">Voting managed by proxy</p>
                        <p className="mt-0.5 text-foreground/60">
                          You have appointed a proxy to vote on your behalf at this meeting.
                        </p>
                      </div>
                    )}

                    {voteMsg && (
                      <div
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-sm font-medium",
                          voteMsg.kind === "ok"
                            ? "border-primary/20 bg-primary/5 text-primary"
                            : "border-red-200 bg-red-50 text-red-600",
                        )}
                      >
                        {voteMsg.text}
                      </div>
                    )}

                    {(openRes.nominees?.length ?? 0) > 0 ? (
                      // Item G — multi-nominee resolution: per-nominee ballot.
                      <NomineeBallot
                        resolution={openRes}
                        disabled={hasProxy}
                        submitting={voting}
                        onCast={(nomineeVotes) => {
                          setVoteMsg(null);
                          castVote(
                            { resolutionId: openRes.id, data: { nomineeVotes } },
                            {
                              onSuccess: () => setVoteMsg({ kind: "ok", text: "Your votes have been recorded." }),
                              onError: (err: any) => {
                                const status = err?.response?.status;
                                setVoteMsg({
                                  kind: "err",
                                  text:
                                    status === 409
                                      ? "You've already voted on this resolution."
                                      : err?.response?.data?.message ||
                                        "Could not record your votes. Please try again.",
                                });
                              },
                            },
                          );
                        }}
                      />
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((opt) => {
                            const selected = vote === opt;
                            const Icon = opt === "FOR" ? Check : opt === "AGAINST" ? X : Minus;
                            const tone =
                              opt === "FOR"
                                ? "border-primary/30 text-primary hover:bg-primary/5"
                                : opt === "AGAINST"
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-foreground/15 text-foreground/60 hover:bg-foreground/5";
                            const selectedTone =
                              opt === "FOR"
                                ? "bg-primary text-white border-primary"
                                : opt === "AGAINST"
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-foreground text-background border-foreground";
                            return (
                              <button
                                key={opt}
                                onClick={() => setVote(opt)}
                                disabled={voting || hasProxy}
                                className={cn(
                                  "flex items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                                  selected ? selectedTone : tone,
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                {opt.charAt(0) + opt.slice(1).toLowerCase()}
                              </button>
                            );
                          })}
                        </div>
                        <Button size="lg" fullWidth disabled={!vote || voting || hasProxy} loading={voting} onClick={handleCastVote}>
                          {vote ? `Cast vote: ${vote.charAt(0) + vote.slice(1).toLowerCase()}` : "Choose an option"}
                        </Button>
                      </>
                    )}

                    {openRes.forCount + openRes.againstCount + openRes.abstainCount > 0 && (
                      <div className="border-t border-foreground/[0.06] pt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live tally
                        </p>
                        <ResolutionBars r={openRes} shareWeighted={shareWeighted} />
                        {/* Item N — three-column source split */}
                        <SourceBreakdown r={openRes} shareWeighted={shareWeighted} />
                      </div>
                    )}
                  </div>
                ) : sortedRes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                      {allClosed ? "Results" : "Resolutions"}
                    </p>
                    {sortedRes.map((r, idx) => {
                      const v = (r.myVote || "").toUpperCase();
                      const s = (r.status || "").toUpperCase();
                      const label = v
                        ? `Voted ${v.charAt(0) + v.slice(1).toLowerCase()}`
                        : s === "OPEN" ? "Open" : s === "CLOSED" ? "Closed" : s === "WAITING" ? "Waiting" : "Pending";
                      const tone = v
                        ? "bg-primary/10 text-primary"
                        : s === "OPEN" ? "bg-amber-100 text-amber-700" : "bg-foreground/[0.06] text-foreground/60";
                      const showResult =
                        s === "CLOSED" && r.forCount + r.againstCount + r.abstainCount > 0;
                      return (
                        <div key={r.id} className="rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm text-foreground/50">Resolution {idx + 1}</p>
                              <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{r.title}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>
                          </div>
                          {showResult && (
                            <div className="mt-3 border-t border-foreground/[0.06] pt-2">
                              <ResolutionBars r={r} shareWeighted={shareWeighted} />
                              <SourceBreakdown r={r} shareWeighted={shareWeighted} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-foreground/50">
                    No resolutions for this meeting yet.
                  </div>
                ))}
              
              {tab === "poll" && (
                <div className="flex flex-col gap-4">
                  {!activePoll ? (
                    <div className="py-8 text-center text-sm text-foreground/50">
                      No active poll at the moment.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                      <div className="mb-4">
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                          Live Poll
                        </span>
                        <h3 className="mt-2 text-sm font-medium tracking-[-0.14px] text-foreground">
                          {activePoll.question}
                        </h3>
                      </div>

                      {pollMsg && (
                        <div className={cn(
                          "mb-4 rounded-xl border px-3 py-2.5 text-sm font-medium",
                          pollMsg.kind === "ok" ? "border-primary/20 bg-primary/5 text-primary" : "border-red-200 bg-red-50 text-red-600"
                        )}>
                          {pollMsg.text}
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
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
                                  : "border-foreground/10 hover:border-primary/50 hover:bg-foreground/[0.02]"
                              )}
                            >
                              <span className="text-sm font-medium tracking-[-0.14px] text-foreground">{opt.text}</span>
                              {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>

                      {!activePoll.myResponse && (
                        <Button
                          size="lg"
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
                <div className="flex flex-col gap-3">
                  {pressKitForbidden ? (
                    <div className="py-8 text-center text-sm text-foreground/50">
                      You must be registered for this event to view the press kit.
                    </div>
                  ) : !pressKit || pressKit.totalCount === 0 ? (
                    <div className="py-8 text-center text-sm text-foreground/50">
                      No press kit files have been released yet.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium tracking-[-0.14px] text-foreground">Digital Press Kit</h3>
                        <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-foreground/60">
                          {pressKit.releasedCount} / {pressKit.totalCount} released
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
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
                                    isReleased ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-foreground/50",
                                  )}
                                >
                                  <FileBox className="h-4.5 w-4.5" />
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

function ResolutionBars({ r, shareWeighted }: { r: Resolution; shareWeighted: boolean }) {
  const totalShares = r.forShares + r.againstShares + r.abstainShares;
  const totalCount = r.forCount + r.againstCount + r.abstainCount;
  // Use shares only when the register supports it and there are shares to show.
  const useShares = shareWeighted && totalShares > 0;
  const denom = useShares ? totalShares : totalCount;
  const pct = (count: number, shares: number) =>
    denom ? Math.round(((useShares ? shares : count) / denom) * 100) : 0;
  const rows = [
    { label: "For", count: r.forCount, shares: r.forShares, color: "bg-primary" },
    { label: "Against", count: r.againstCount, shares: r.againstShares, color: "bg-red-500" },
    { label: "Abstain", count: r.abstainCount, shares: r.abstainShares, color: "bg-foreground/30" },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-0.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-foreground/60">
                {row.count}
                {useShares ? ` · ${row.shares.toLocaleString()} shares` : ""} · {pct(row.count, row.shares)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <div className={`${row.color} h-full`} style={{ width: `${pct(row.count, row.shares)}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}
