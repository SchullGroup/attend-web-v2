"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, MapPin, CalendarDays, Trophy, Target,
  BookOpen, CalendarClock, Cpu, Radio, ChevronDown,
} from "lucide-react";
import { useGetChallenge, useGetMyTeam, useGetResources } from "@/api/hackathon/hooks";
import { useGetEvent } from "@/api/events/hooks";
import { ChallengeDetailData } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, cn } from "@/lib/utils";

export default function HackathonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
      <div className="space-y-4">
        <div className="h-6 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-56 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          This challenge could not be loaded right now. Please try again shortly.
        </div>
      </div>
    );
  }

  const submitted =
    !!myTeam?.submissionStatus && myTeam.submissionStatus !== "NOT_SUBMITTED";
  const hasTeamSize = !!challenge.minTeamSize && !!challenge.maxTeamSize;

  const isLive = (challenge.status || "").toUpperCase() === "LIVE";
  // Applying requires RSVP'ing to the event first ΓÇö falls back to `registered` only until
  // backend's hasRsvped field is live everywhere (same pattern as events/[id]/page.tsx).
  const hasRsvped = challenge.hasRsvped ?? challenge.registered;
  // One progression, used by all three CTA slots on this page (hero x2, footer):
  // RSVP to Apply ΓåÆ Apply now ΓåÆ View Application, with Join Live taking priority.
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
  const logoUrl =
    challenge.branding?.logoUrl ||
    (challenge as any).organizerLogo ||
    (challenge as any).registerLogo ||
    null;

  return (
    <div
      className="challenge-scope space-y-6"
      style={{
        "--brand-primary": brandPrimary,
        "--brand-accent":  brandAccent,
      } as React.CSSProperties}
    >
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* LIVE banner ΓÇö only shown when the session is live */}
      {isLive && (
        <Link
          href={`/events/live?eventId=${id}`}
          className="flex items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 shadow-sm transition-colors"
          style={{
            borderColor: `${brandAccent}40`,
            backgroundColor: `${brandPrimary}08`,
            color: 'var(--brand-primary)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
            <span className="text-sm font-semibold">This session is live now</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Radio className="h-3.5 w-3.5" /> Join Live
          </div>
        </Link>
      )}

      {challenge.bannerUrl ? (
        <div
          className="relative aspect-video w-full overflow-hidden rounded-3xl p-6 text-white md:p-8 flex flex-col justify-end"
          style={{
            backgroundImage: `url(${challenge.bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: "240px"
          }}
        >
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-transparent" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              {logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt=""
                  className="h-6 w-6 rounded bg-white/95 object-cover shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{challenge.organizerName}</p>
            </div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{challenge.title}</h1>
            {challenge.description && <p className="max-w-2xl text-sm text-white/85">{challenge.description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {isLive ? (
                <Link href={`/events/live?eventId=${id}`}>
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold hover:bg-white/90"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--brand-primary)" />
                    Join Live session
                  </button>
                </Link>
              ) : (
                <Link href={cta.href}>
                  <button
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold hover:bg-white/90"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    {cta.label}
                  </button>
                </Link>
              )}
              <Link href={`/hackathon/resources?challengeId=${id}`}>
                <button className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/20">
                  Resources{challenge.resourceCount > 0 ? ` (${challenge.resourceCount})` : ""}
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <header
          className="relative overflow-hidden rounded-3xl p-6 text-white md:p-8"
          style={{
            background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-accent) 100%)`,
          }}
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              {logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt=""
                  className="h-6 w-6 rounded bg-white/95 object-cover shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{challenge.organizerName}</p>
            </div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{challenge.title}</h1>
            {challenge.description && <p className="max-w-2xl text-sm text-white/85">{challenge.description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {isLive ? (
                <Link href={`/events/live?eventId=${id}`}>
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold hover:bg-white/90"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--brand-primary)" />
                    Join Live session
                  </button>
                </Link>
              ) : (
                <Link href={cta.href}>
                  <button
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold hover:bg-white/90"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    {cta.label}
                  </button>
                </Link>
              )}
              <Link href={`/hackathon/resources?challengeId=${id}`}>
                <button className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/20">
                  Resources{challenge.resourceCount > 0 ? ` (${challenge.resourceCount})` : ""}
                </button>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Problem statement */}
      {challenge.problemStatement && (
        <section className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">The challenge</p>
          <p className="text-sm leading-relaxed text-foreground/85">{challenge.problemStatement}</p>
          {challenge.expectedDeliverable && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              <span className="font-semibold text-foreground">What to build: </span>
              {challenge.expectedDeliverable}
            </p>
          )}
        </section>
      )}

      {/* Prizes */}
      {challenge.prizeTiers && challenge.prizeTiers.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {challenge.prizeTiers.map((p) => (
            <div key={p.position} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center gap-2 text-(--brand-primary)">
                <Trophy className="h-4.5 w-4.5" />
                <p className="text-xs font-semibold uppercase tracking-wide">{p.position}</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{p.reward}</p>
            </div>
          ))}
        </section>
      )}

      {/* Key facts ΓÇö each tile only when the backend provides it */}
      <section className="grid gap-4 md:grid-cols-2">
        {challenge.tracks && challenge.tracks.length > 0 && (
          <InfoBlock icon={Target} title="Pathways">
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
          </InfoBlock>
        )}
        {hasTeamSize && (
          <InfoBlock icon={Users} title="Team size">
            <p className="text-sm text-foreground">
              {challenge.minTeamSize}ΓÇô{challenge.maxTeamSize} members per team
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

      {resources.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Resources</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {resources.map((res) => {
              const isFile = res.resourceType === "FILE";
              return (
                <a
                  key={res.id}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{res.title}</p>
                    {res.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{res.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <Badge variant="muted" className="text-[10px] uppercase">
                      {res.category || (isFile ? res.fileType || "File" : "Link")}
                    </Badge>
                    {isFile && res.sizeBytes > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {(res.sizeBytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {myTeam && (
        <section
          className="rounded-2xl border p-5"
          style={{
            borderColor: `${brandAccent}40`,
            backgroundColor: `${brandPrimary}08`,
          }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--brand-primary)">Your team</p>
          <p className="text-base font-semibold text-foreground">{myTeam.name}</p>
          {myTeam.description && <p className="mt-1 text-sm text-muted-foreground">{myTeam.description}</p>}
          <div className="mt-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {myTeam.memberCount} member{myTeam.memberCount !== 1 ? "s" : ""}
            </span>
            {submitted && <Badge variant="success">Submitted</Badge>}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event details</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> {formatDate(challenge.date)}
              {challenge.startTime ? ` ┬╖ ${challenge.startTime}` : ""}
            </div>
            {challenge.venue && (
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {challenge.venue}</div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organiser</p>
          <p className="text-sm font-semibold text-foreground">{challenge.organizerName}</p>
          {challenge.registered && (
            <p className="mt-1 text-xs text-emerald-700">You&apos;re registered for this challenge.</p>
          )}
        </div>
      </section>

      {/* How to apply ΓÇö mirrors the mobile app's "How to Apply" tab, collapsed by
          default here since it's positioned right above the CTA it explains. Steps
          read real challenge data (pathway count, organiser name) instead of the
          mobile copy's hardcoded "three pathways"/"MeriHack", so this stays correct
          across every challenge. Step 5 ("Build & Submit") dropped per instruction. */}
      <section className="rounded-2xl border border-border bg-white">
        <button
          type="button"
          onClick={() => setShowHowTo((v) => !v)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            How to apply
          </p>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showHowTo && "rotate-180",
            )}
          />
        </button>
        {showHowTo && (
          <div className="space-y-5 px-5 pb-5">
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
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA ΓÇö mirrors the demo's "Ready to build?" footer */}
      {!submitted && (
        <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">Ready to build?</p>
            {challenge.applicationDeadline && (
              <p className="text-xs text-muted-foreground">
                Submissions close {formatDate(challenge.applicationDeadline)}.
              </p>
            )}
          </div>
          {isLive ? (
            <Link href={`/events/live?eventId=${id}`}>
              <button
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Join Live session
              </button>
            </Link>
          ) : (
            // Only reached when !submitted (section is gated on that above), so cta here
            // only ever resolves to "RSVP to Apply" or "Apply now".
            <Link href={cta.href}>
              <button
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {cta.label}
              </button>
            </Link>
          )}
        </section>
      )}
    </div>
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
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}
