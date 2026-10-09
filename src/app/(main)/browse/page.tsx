"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, CalendarDays } from "lucide-react";
import { useGetEvents, useGetSavedEvents } from "@/api/events/hooks";
import type { EventListItem } from "@/types";
import { cn } from "@/lib/utils";
import { EventListRow } from "@/components/attend/EventListRow";
import { isEventCurrent, compareByStartAsc, compareLiveFirst } from "@/lib/rsvp";

// Every event type in one list: AGMs, launches, innovation challenges and general events.
// Home's "View all" links and its "Browse All Events" banner used to go to /events, which is the
// Launches page and lists product launches only, so a live AGM never showed up there
// (reported 2026-10-09). The tab is in the URL (?tab=live|upcoming) so each link opens the right
// one. Same data and rules as Home: Live = status LIVE, Upcoming = not live and not over yet.

type Tab = "all" | "live" | "upcoming";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live now" },
  { key: "upcoming", label: "Upcoming" },
];
const isTab = (t: string | null): t is Tab => t === "all" || t === "live" || t === "upcoming";

function BrowseInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initial) ? initial : "all");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useGetEvents({ search: query || undefined, size: 100 });
  const apiEvents = data?.data?.events ?? [];

  const { data: savedResp } = useGetSavedEvents();
  const savedIds = useMemo(
    () => new Set((savedResp?.data?.events ?? []).map((e) => e.id)),
    [savedResp],
  );

  const visible = useMemo((): EventListItem[] => {
    const list = apiEvents.filter((e) => {
      if (tab === "live") return e.status === "LIVE";
      if (tab === "upcoming") return isEventCurrent(e, { excludeLive: true });
      return isEventCurrent(e);
    });
    return list.sort((a, b) => compareLiveFirst(a, b) || compareByStartAsc(a, b));
  }, [apiEvents, tab]);

  function selectTab(t: Tab) {
    setTab(t);
    // Keep the URL in step, so back/refresh return to the same tab.
    router.replace(t === "all" ? "/browse" : `/browse?tab=${t}`, { scroll: false });
  }

  const emptyMessage = query
    ? "No events match that search."
    : tab === "live"
      ? "Nothing is live right now."
      : tab === "upcoming"
        ? "There are no upcoming events at the moment."
        : "There are no live or upcoming events at the moment.";

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-foreground/10 px-4 md:-mx-8 md:px-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-6 py-2 text-sm tracking-[-0.14px] transition-colors",
              tab === t.key
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative sm:max-w-xs">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or organiser"
          className="h-10 w-full rounded-full border border-foreground/5 bg-foreground/3 pl-10 pr-3 text-sm tracking-[-0.14px] text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary"
        />
      </div>

      {isLoading && (
        <p className="py-8 text-center text-sm text-foreground/50">Loading events…</p>
      )}

      {!isLoading && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground/50">{emptyMessage}</p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visible.map((e) => (
          <EventListRow key={e.id} event={e} saved={savedIds.has(e.id)} fallbackIcon={CalendarDays} />
        ))}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseInner />
    </Suspense>
  );
}
