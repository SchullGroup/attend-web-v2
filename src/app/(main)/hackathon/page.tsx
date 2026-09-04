"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Lightbulb, Clock } from "lucide-react";
import { useGetChallenges, useGetMyTeams } from "@/api/hackathon/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

// Ported from the figma-redesign branch. figma's card design is kept as-is, but
// the primary CTA is made state-aware again via useGetMyTeams (figma had a plain
// "Apply Now" for everyone). Retaining this progression matters: applying to a
// challenge requires RSVP'ing first, and an already-submitted user should go to
// their application, not the apply form. figma's "View Details" stays as the
// secondary button.

// Deterministic pastel tile per organiser — same approach as Home (no real
// per-challenge photo asset from the API yet).
const TILE_TINTS = ["#f9b6ff", "#8ba6ff", "#c3e1d0", "#dbe1c3", "#f6f6f6", "#e2e2e2"];
function tileTint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return TILE_TINTS[h % TILE_TINTS.length];
}

function fmtTime(startTime?: string) {
  if (!startTime) return "--";
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return startTime;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export default function HackathonPage() {
  const [q, setQ] = useState("");
  const { data, isLoading: chLoading } = useGetChallenges({ search: q || undefined });
  const { data: evData, isLoading: evLoading } = useGetEvents({ search: q || undefined });
  const { data: myTeamsResp } = useGetMyTeams();

  // Same progression as the challenge detail page (RSVP to Apply → Apply now →
  // View Application) — looked up per card by eventId rather than fetched per card.
  const submittedEventIds = new Set(
    (myTeamsResp?.data?.teams ?? [])
      .filter((t) => t.submissionStatus && t.submissionStatus !== "NOT_SUBMITTED")
      .map((t) => t.eventId),
  );

  // Innovation events live in two places: the /challenges collection and the
  // shared /events collection (typed HACKATHON / INNOVATION_CHALLENGE). Merge both,
  // de-duplicated by id, so nothing is missed.
  const challengeEvents = data?.data?.events ?? [];
  const eventInnovation = (evData?.data?.events ?? []).filter(
    (e) => e.eventType === "HACKATHON" || e.eventType === "INNOVATION_CHALLENGE",
  );
  const apiChallenges = Array.from(
    new Map([...challengeEvents, ...eventInnovation].map((e) => [e.id, e])).values(),
  ).filter((e) => e.status !== "ENDED");

  const isLoading = chLoading || evLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Title + tagline live in the app bar for this section (NavShell SECTION_TITLE),
          per Figma — repeating them here stacked two near-identical headings. */}

      {/* Tabs — "My Application" is a real route (hackathon/my-applications), not a
          local filter, so the tab bar is just links between the two pages. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-foreground/10 px-4 md:-mx-8 md:px-8">
        <span className="border-b-2 border-foreground px-6 py-2 text-sm font-semibold tracking-[-0.14px] text-foreground">
          All
        </span>
        <Link
          href="/hackathon/my-applications"
          className="border-b-2 border-transparent px-6 py-2 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
        >
          My Application
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search innovation challenges or organisers"
          className="h-[50px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] pl-10 pr-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
        />
      </div>

      {isLoading && (
        <p className="py-8 text-center text-sm text-foreground/50">Loading challenges…</p>
      )}

      {!isLoading && apiChallenges.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground/50">
          No innovation challenges available right now. Check back soon.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {apiChallenges.map((c: EventListItem) => {
          const organiser = c.registerName || c.organizerName;
          const isLive = (c.status || "").toUpperCase() === "LIVE";
          const submitted = submittedEventIds.has(c.id);
          // Join Live overrides everything; otherwise RSVP to Apply → Apply now →
          // View Application, since applying requires RSVP'ing to the challenge first.
          const primaryCta = isLive
            ? { label: "Join Live", href: `/events/live?eventId=${c.id}` }
            : submitted
              ? { label: "View Application", href: "/hackathon/my-applications" }
              : c.hasRsvped
                ? { label: "Apply Now", href: `/hackathon/apply?challengeId=${c.id}` }
                : { label: "RSVP to Apply", href: `/events/${c.id}` };
          return (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-foreground/[0.06] bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]"
            >
              <div className="flex gap-2.5">
                <div
                  className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                  style={{ backgroundColor: tileTint(organiser || c.title) }}
                >
                  {c.organizerLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.organizerLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Lightbulb className="h-6 w-6 text-foreground/60" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                      {c.title}
                    </p>
                    {isLive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-red-600" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-foreground/60">
                    <span>By:</span>
                    <span className="text-foreground/80">{organiser}</span>
                  </p>
                  <p className="flex items-center gap-1 text-xs text-foreground/80">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(c.date)}, {fmtTime(c.startTime)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={primaryCta.href} className="flex-1">
                  <Button size="lg" fullWidth>{primaryCta.label}</Button>
                </Link>
                <Link href={`/hackathon/${c.id}`} className="flex-1">
                  <Button
                    size="lg"
                    variant="ghost"
                    fullWidth
                    className="bg-foreground/[0.04] font-medium hover:bg-foreground/[0.08]"
                  >
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
