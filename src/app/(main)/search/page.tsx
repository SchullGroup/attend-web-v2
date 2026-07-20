"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGetEvents } from "@/api/events/hooks";
import { useGetChallenges } from "@/api/hackathon/hooks";
import { EventListItem } from "@/types";
import { ModuleBadge } from "@/components/attend/ModuleBadge";
import { formatDate, initialsFor, formatEventFormat } from "@/lib/utils";

const isInnovation = (t?: string) => t === "HACKATHON" || t === "INNOVATION_CHALLENGE";

function SearchInner() {
  const q = useSearchParams().get("q") ?? "";

  const { data: evData, isLoading: evLoading } = useGetEvents({ search: q || undefined });
  const { data: chData, isLoading: chLoading } = useGetChallenges({ search: q || undefined });

  const isLoading = !!q && (evLoading || chLoading);
  const events = evData?.data?.events ?? [];
  const challenges = chData?.data?.events ?? [];
  // Merge events + challenges, de-duplicated by id.
  const results = Array.from(
    new Map([...events, ...challenges].map((e) => [e.id, e])).values(),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">
          {q ? (
            <>
              Results for &ldquo;<span className="font-medium text-foreground">{q}</span>&rdquo;
            </>
          ) : (
            "Search events, companies and challenges from the bar above."
          )}
        </p>
      </header>

      {!q ? null : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No results for &ldquo;{q}&rdquo;. Try a different word.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-white">
          {results.map((e: EventListItem, i) => {
            const href = isInnovation(e.eventType) ? `/hackathon/${e.id}` : `/events/${e.id}`;
            return (
              <li key={e.id} className={i > 0 ? "border-t border-border" : ""}>
                <Link href={href} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                    {initialsFor(e.registerName || e.organizerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.registerName || e.organizerName} · {formatDate(e.date)}
                      {e.format ? ` · ${formatEventFormat(e.format)}` : ""}
                    </p>
                  </div>
                  <ModuleBadge module={e.eventType} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
