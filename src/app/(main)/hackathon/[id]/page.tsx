"use client";
import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, X, Users, MapPin, CalendarDays, Trophy, Target,
  BookOpen, CalendarClock, Cpu, Radio, Clock, ChevronDown,
} from "lucide-react";
import { useGetChallenge, useGetMyTeam, useGetResources } from "@/api/hackathon/hooks";
import { useGetEvent } from "@/api/events/hooks";
import { ChallengeDetailData } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatDate } from "@/lib/utils";
import { useGoBack } from "@/hooks/useGoBack";

// Laid out to Figma's challenge-detail frame: a purely decorative banner (no text or
// controls inside it), the title/meta on the page beneath it, Overview | Prizes tabs,
// NavRow links, and ONE full-width CTA at the end. OUR logic is grafted on: the
// event-detail fallback when the challenge endpoint fails, the brand-colour chain, the
// RSVP-before-apply gate (`cta`), the team card, and the data-driven "How to apply".

function fmtTime(startTime?: string) {
  if (!startTime) return "";
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return startTime;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "prizes", label: "Prizes" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function HackathonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const goBack = useGoBack("/hackathon");
  const [tab, setTab] = useState<TabKey>("overview");
  // Figma reveals resources as a panel beside the brief on this same page, rather
  // than navigating to /hackathon/resources (that route stays for direct links).
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const { data: chData, isLoading: chLoading, error: chError } = useGetChallenge(id);
  const liveChallenge = chData?.data;

  // The challenge *detail* endpoint can fail (e.g. a backend 500) even when the
  // challenge exists. Since an innovation challenge is also a real event, fall back
  // to the event detail (same id) so the page still works with live data.
  const challengeFailed = !chLoading && (!!chError || !liveChallenge);
  const { data: evData, isLoading: evLoading } = useGetEvent(challengeFailed ? id : "");
  const { data: myTeamData } = useGetMyTeam(id);
  const { data: resData } = useGetResources(id);
  const resources = resData?.data ?? [];

  const ev = evData?.data;
  const team = myTeamData?.data;

  const challenge: ChallengeDetailData | null = liveChallenge
    ? liveChallenge
    : ev
    ? {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        eventType: ev.eventType,
        status: ev.status,
        date: ev.date,
        startTime: ev.startTime,
        venue: ev.venue,
        organizerName: ev.registerName || ev.organizerName,
        registered: ev.registered,
        hasRsvped: ev.hasRsvped,
        resourceCount: 0,
        branding: ev.branding,
        bannerUrl: ev.bannerUrl,
        brandPrimary: ev.brandPrimary,
        brandAccent: ev.brandAccent,
        myTeam: team
          ? {
              id: team.id,
              name: team.name,
              description: team.description,
              memberCount: team.members?.length ?? 0,
              submissionStatus: team.submission?.status ?? "NOT_SUBMITTED",
            }
          : null,
      }
    : null;

  const myTeam = challenge?.myTeam;
  const isLoading = chLoading || (challengeFailed && evLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-foreground/5" />
        <div className="h-56 animate-pulse rounded-2xl bg-foreground/5" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex flex-col gap-6">
        <button onClick={goBack} className="inline-flex w-fit items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Innovation
        </button>
        <div className="rounded-xl border border-foreground/[0.06] bg-white p-10 text-center text-sm text-foreground/50">
          This challenge could not be loaded right now. Please try again shortly.
        </div>
      </div>
    );
  }

  const isLive = (challenge.status || "").toUpperCase() === "LIVE";
  const resourceCount = resources.length || challenge.resourceCount;
  const submitted =
    !!myTeam?.submissionStatus && myTeam.submissionStatus !== "NOT_SUBMITTED";

  // Applying requires RSVP'ing to the event first — falls back to `registered` only until
  // backend's hasRsvped field is live everywhere (same pattern as events/[id]/page.tsx).
  const hasRsvped = challenge.hasRsvped ?? challenge.registered;
  // One progression for the page's single CTA: RSVP to Apply → Apply now →
  // View Application, with Join Live taking priority.
  const cta = submitted
    ? { label: "View Application", href: "/hackathon/my-applications" }
    : hasRsvped
    ? { label: "Apply now", href: `/hackathon/apply?challengeId=${id}` }
    : { label: "RSVP to Apply", href: `/events/${id}` };

  const brandPrimary =
    challenge.brandPrimary ||
    challenge.branding?.brandColor ||
    (challenge as any).organizerPrimaryColor ||
    "#9333ea";
  const brandAccent =
    challenge.brandAccent ||
    challenge.branding?.brandColor ||
    (challenge as any).organizerPrimaryColor ||
    "#c084fc";
  const heroStyle: React.CSSProperties = challenge.bannerUrl
    ? {
        backgroundImage: `url(${challenge.bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandAccent} 100%)` };

  return (
    <div
      className={cn(
        "challenge-scope",
        resourcesOpen
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
          : "flex w-full max-w-2xl flex-col gap-6",
      )}
      style={{
        "--brand-primary": brandPrimary,
        "--brand-accent": brandAccent,
      } as React.CSSProperties}
    >
      <div className="flex w-full max-w-2xl flex-col gap-6">
      {/* LIVE banner — only shown when the session is live */}
      {isLive && (
        <Link
          href={`/events/live?eventId=${id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-5 py-3.5 text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-semibold">This session is live now</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-sm font-semibold text-background">
            <Radio className="h-3.5 w-3.5" /> Join Live
          </div>
        </Link>
      )}

      {/* Banner — per-challenge photo when the organiser supplied one, else the brand
          gradient. Decorative only: the title and CTAs live on the page below it. */}
      <div className="aspect-[540/160] w-full overflow-hidden rounded-xl" style={heroStyle} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">{challenge.title}</h1>
        <p className="text-xs tracking-[-0.12px] text-foreground/60">
          By: <span className="text-foreground/80">{challenge.organizerName}</span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/80">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(challenge.date)}
          {challenge.startTime ? `, ${fmtTime(challenge.startTime)}` : ""}
          {challenge.venue && (
            <>
              <span className="h-1 w-1 rounded-full bg-foreground/20" />
              <MapPin className="h-3.5 w-3.5" /> {challenge.venue}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-foreground/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 px-6 py-2 text-sm tracking-[-0.14px] transition-colors",
              tab === t.key
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          {(challenge.problemStatement || challenge.description) && (
            <section>
              <h2 className="mb-1.5 text-sm font-semibold text-foreground">Challenge briefs</h2>
              <p className="text-sm leading-relaxed text-foreground/70">
                {challenge.problemStatement || challenge.description}
              </p>
              {challenge.expectedDeliverable && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                  <span className="font-medium text-foreground">What to build: </span>
                  {challenge.expectedDeliverable}
                </p>
              )}
            </section>
          )}

          {challenge.tracks && challenge.tracks.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Pathway</h2>
              <div className="flex flex-wrap gap-2">
                {challenge.tracks.map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-(--brand-primary)"
                    style={{ backgroundColor: `${brandPrimary}15` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Key facts — each tile only when the backend provides it */}
          {(challenge.eligibilityCriteria || challenge.applicationDeadline || challenge.allowedTechStack || (challenge.minTeamSize && challenge.maxTeamSize)) && (
            <section className="grid gap-3 sm:grid-cols-2">
              {!!challenge.minTeamSize && !!challenge.maxTeamSize && (
                <InfoBlock icon={Users} title="Team size">
                  <p className="text-sm text-foreground">
                    {challenge.minTeamSize}–{challenge.maxTeamSize} members per team
                  </p>
                </InfoBlock>
              )}
              {challenge.eligibilityCriteria && (
                <InfoBlock icon={BookOpen} title="Eligibility">
                  <p className="text-sm text-foreground">{challenge.eligibilityCriteria}</p>
                </InfoBlock>
              )}
              {challenge.applicationDeadline && (
                <InfoBlock icon={CalendarClock} title="Submission deadline">
                  <p className="text-sm font-semibold text-foreground">{formatDate(challenge.applicationDeadline)}</p>
                </InfoBlock>
              )}
              {challenge.allowedTechStack && (
                <InfoBlock icon={Cpu} title="Allowed tech stack">
                  <p className="text-sm text-foreground">{challenge.allowedTechStack}</p>
                </InfoBlock>
              )}
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoBlock icon={CalendarDays} title="Event details">
              <div className="space-y-1 text-sm text-foreground/70">
                <p>
                  {formatDate(challenge.date)}
                  {challenge.startTime ? ` · ${fmtTime(challenge.startTime)}` : ""}
                </p>
                {challenge.venue && <p>{challenge.venue}</p>}
              </div>
            </InfoBlock>
            <InfoBlock icon={Target} title="Organiser">
              <p className="text-sm font-medium text-foreground">{challenge.organizerName}</p>
              {challenge.registered && (
                <p className="mt-1 text-xs text-primary">You&apos;re registered for this challenge.</p>
              )}
            </InfoBlock>
          </section>

          {/* Your team — kept from our version (real state figma had no slot for), in
              the same card language as the InfoBlocks around it. */}
          {myTeam && (
            <section className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
              <div className="mb-2 flex items-center gap-2 text-foreground/50">
                <Users className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Your team</p>
              </div>
              <p className="text-sm font-medium text-foreground">{myTeam.name}</p>
              {myTeam.description && <p className="mt-1 text-sm text-foreground/60">{myTeam.description}</p>}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-foreground/60">
                  {myTeam.memberCount} member{myTeam.memberCount !== 1 ? "s" : ""}
                </span>
                {submitted && <Badge variant="success">Submitted</Badge>}
              </div>
            </section>
          )}

          {/* How to apply — steps read real challenge data (pathway count, organiser
              name), collapsed by default since it sits just above the CTA it explains. */}
          <section className="rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            <button
              type="button"
              onClick={() => setShowHowTo((v) => !v)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                How to apply
              </p>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-foreground/40 transition-transform",
                  showHowTo && "rotate-180",
                )}
              />
            </button>
            {showHowTo && (
              <div className="flex flex-col gap-5 px-5 pb-5">
                {[
                  {
                    title: "Register & Form Team",
                    body: "Create your account on Attend, then apply individually or invite teammates by email or username.",
                  },
                  ...(challenge.tracks && challenge.tracks.length > 0
                    ? [
                        {
                          title: "Select a Pathway",
                          body: `Choose one of the ${challenge.tracks.length} challenge pathway${challenge.tracks.length !== 1 ? "s" : ""} that best fits your solution idea.`,
                        },
                      ]
                    : []),
                  {
                    title: "Submit Your Application",
                    body:
                      challenge.tracks && challenge.tracks.length > 0
                        ? "Complete the application form with your team details, idea title, description, and pathway selection."
                        : "Complete the application form with your team details, idea title, and description.",
                  },
                  {
                    title: "Await Review",
                    body: `Applications are reviewed by the ${challenge.organizerName} committee. Shortlisted teams are notified by email and in-app.`,
                  },
                ].map((step, i) => (
                  <div key={step.title} className="flex gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "var(--brand-primary)" }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="mt-0.5 text-sm text-foreground/60">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "prizes" && (
        <div className="flex flex-col gap-5">
          {challenge.prizeTiers && challenge.prizeTiers.length > 0 ? (
            <section className="grid gap-3 sm:grid-cols-3">
              {challenge.prizeTiers.map((p) => (
                <div key={p.position} className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-2 text-(--brand-primary)">
                    <Trophy className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wide">{p.position}</p>
                  </div>
                  <p className="mt-2 text-2xl font-medium text-foreground">{p.reward}</p>
                </div>
              ))}
            </section>
          ) : (
            <p className="py-8 text-center text-sm text-foreground/50">
              Prize information hasn&apos;t been published for this challenge yet.
            </p>
          )}
        </div>
      )}

      {/* Bottom nav rows — Resources always; "My Application" once a team exists. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <NavRowButton
          onClick={() => setResourcesOpen((v) => !v)}
          label={`Challenge Resources${resourceCount > 0 ? ` (${resourceCount})` : ""}`}
          className={myTeam ? "flex-1" : "w-full"}
        />
        {myTeam && (
          <NavRow href={`/hackathon/my-applications?challengeId=${id}`} label="My Application" className="flex-1" />
        )}
      </div>

      {/* Single CTA — Join Live wins; otherwise our RSVP-gated progression. Once the
          application is in, the "My Application" row above is the way back to it. */}
      {isLive ? (
        <Link href={`/events/live?eventId=${id}`}>
          <Button size="lg" fullWidth>Join Live session</Button>
        </Link>
      ) : (
        !submitted && (
          <Link href={cta.href}>
            <Button size="lg" fullWidth>{cta.label}</Button>
          </Link>
        )
      )}
      </div>

      {resourcesOpen && (
        <aside className="mt-6 flex flex-col gap-3 lg:mt-0 lg:border-l lg:border-foreground/10 lg:pl-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-[-0.14px] text-foreground">Challenge Resources</h2>
            <button
              type="button"
              onClick={() => setResourcesOpen(false)}
              aria-label="Close resources"
              className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {resources.length === 0 ? (
            <p className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-foreground/50">
              The organiser hasn&apos;t published any resources yet.
            </p>
          ) : (
            resources.map((res) => {
              const isFile = res.resourceType === "FILE";
              return (
                <div
                  key={res.id}
                  className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] text-[10px] font-semibold uppercase text-foreground/50">
                    {isFile ? (res.fileType || "Doc").slice(0, 3) : "Link"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{res.title}</p>
                    {(res.description || (isFile && res.sizeBytes > 0)) && (
                      <p className="truncate text-xs text-foreground/60">
                        {res.description ||
                          `${(res.sizeBytes / 1024 / 1024).toFixed(1)} MB`}
                      </p>
                    )}
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-foreground/[0.04] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.08]"
                  >
                    {isFile ? "Download" : "Open"}
                  </a>
                </div>
              );
            })
          )}
        </aside>
      )}
    </div>
  );
}

// Same row as NavRow, but it toggles the on-page resources panel instead of routing.
function NavRowButton({ onClick, label, className }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-white px-5 py-4 text-left text-sm font-medium tracking-[-0.14px] text-foreground transition-colors hover:bg-foreground/[0.02]",
        className,
      )}
    >
      {label}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.04]">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function NavRow({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-white px-5 py-4 text-sm font-medium tracking-[-0.14px] text-foreground transition-colors hover:bg-foreground/[0.02]",
        className,
      )}
    >
      {label}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.04]">
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Trophy;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      <div className="mb-2 flex items-center gap-2 text-foreground/50">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}
