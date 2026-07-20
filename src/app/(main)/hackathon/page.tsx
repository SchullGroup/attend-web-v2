"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, CalendarDays, ArrowRight, FolderOpen } from "lucide-react";
import { useGetChallenges } from "@/api/hackathon/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

const FORMAT_LABELS: Record<string, string> = {
  IN_PERSON: "In-person",
  VIRTUAL: "Virtual",
  HYBRID: "Hybrid",
};
const fmtFormat = (f: string) => FORMAT_LABELS[f] ?? (f || "").replace(/_/g, "-");

export default function HackathonPage() {
  const [q, setQ] = useState("");
  const { data, isLoading: chLoading } = useGetChallenges({ search: q || undefined });
  const { data: evData, isLoading: evLoading } = useGetEvents({ search: q || undefined });

  // Innovation events live in two places: the /challenges collection and the
  // shared /events collection (typed HACKATHON / INNOVATION_CHALLENGE). Merge both,
  // de-duplicated by id, so nothing is missed.
  const challengeEvents = data?.data?.events ?? [];
  const eventInnovation = (evData?.data?.events ?? []).filter(
    (e) => e.eventType === "HACKATHON" || e.eventType === "INNOVATION_CHALLENGE",
  );
  const apiChallenges = Array.from(
    new Map([...challengeEvents, ...eventInnovation].map((e) => [e.id, e])).values(),
  );

  const isLoading = chLoading || evLoading;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-800 to-fuchsia-900 p-6 text-white md:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Build the future
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight md:text-3xl">
              Innovation Challenges
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Hackathons, build sprints and open problem statements from Nigeria&apos;s
              top financial institutions.
            </p>
          </div>
          <Link href="/hackathon/my-applications">
            <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              <FolderOpen className="h-4 w-4" /> My applications
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search innovation challenges or organisers"
          className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : apiChallenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No innovation challenges available right now. Check back soon.
        </div>
      ) : (
        <ul className="space-y-4">
          {apiChallenges.map((c: EventListItem) => (
            <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                      {c.registerName || c.organizerName}
                    </p>
                    {(c.status || "").toUpperCase() === "LIVE" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        Live
                      </span>
                    )}
                  </div>
                  <h2 className="mt-0.5 text-base font-semibold text-foreground md:text-lg">{c.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(c.date)} · {c.startTime}
                    </span>
                    {c.venue && <span>{c.venue}</span>}
                    <span>{fmtFormat(c.format)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/hackathon/${c.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                  <Link href={`/hackathon/apply?challengeId=${c.id}`}>
                    <Button size="sm">Apply <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
