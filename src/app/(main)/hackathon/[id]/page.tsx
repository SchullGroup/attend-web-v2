"use client";
import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, MapPin, CalendarDays, Trophy, Target,
  BookOpen, CalendarClock, Cpu, Radio, Clock, ChevronRight,
} from "lucide-react";
import { useGetChallenge, useGetMyTeam, useGetResources } from "@/api/hackathon/hooks";
import { useGetEvent } from "@/api/events/hooks";
import { ChallengeDetailData } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn, formatDate } from "@/lib/utils";

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
        resourceCount: 0,
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
  const [tab, setTab] = useState<TabKey>("overview");

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
        <Link href="/hackathon" className="inline-flex w-fit items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Innovation
        </Link>
        <div className="rounded-xl border border-foreground/[0.06] bg-white p-10 text-center text-sm text-foreground/50">
          This challenge could not be loaded right now. Please try again shortly.
        </div>
      </div>
    );
  }

  const isLive = (challenge.status || "").toUpperCase() === "LIVE";
  const resourceCount = resources.length || challenge.resourceCount;

  const brandPrimary = challenge.brandPrimary || "#1f1f1f";
  const brandAccent = challenge.brandAccent || "#3d3d3d";
  const heroStyle: React.CSSProperties = challenge.bannerUrl
    ? {
        backgroundImage: `url(${challenge.bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandAccent} 100%)` };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/hackathon" className="inline-flex w-fit items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Innovation
      </Link>

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

      {/* Banner — per-challenge photo when the organiser supplied one, else a neutral gradient */}
      <div className="h-[220px] w-full overflow-hidden rounded-2xl md:h-[280px]" style={heroStyle} />

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
      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-foreground/10 px-4 md:-mx-8 md:px-8">
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
                  <span key={t} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Key facts — each tile only when the backend provides it */}
          {(challenge.eligibilityCriteria || challenge.applicationDeadline || challenge.allowedTechStack || (challenge.minTeamSize && challenge.maxTeamSize) || (challenge.prizeTiers && challenge.prizeTiers.length > 0)) && (
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
        </div>
      )}

      {tab === "prizes" && (
        <div className="flex flex-col gap-5">
          {challenge.prizeTiers && challenge.prizeTiers.length > 0 ? (
            <section className="grid gap-3 sm:grid-cols-3">
              {challenge.prizeTiers.map((p) => (
                <div key={p.position} className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-2 text-primary">
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

      {/* Bottom nav rows — Resources always; either "Submit Application" (not yet
          applied) or a "My Application" row (already applied) next to it. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <NavRow
          href={`/hackathon/resources?challengeId=${id}`}
          label={`Challenge Resources${resourceCount > 0 ? ` (${resourceCount})` : ""}`}
          className={myTeam ? "flex-1" : "w-full"}
        />
        {myTeam && (
          <NavRow href={`/hackathon/my-applications?challengeId=${id}`} label="My Application" className="flex-1" />
        )}
      </div>

      {isLive ? (
        <Link href={`/events/live?eventId=${id}`}>
          <Button size="lg" fullWidth>Join Live session</Button>
        </Link>
      ) : (
        !myTeam && (
          <Link href={`/hackathon/apply?challengeId=${id}`}>
            <Button size="lg" fullWidth>Submit Application</Button>
          </Link>
        )
      )}
    </div>
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
        <ChevronRight className="h-4 w-4" />
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
