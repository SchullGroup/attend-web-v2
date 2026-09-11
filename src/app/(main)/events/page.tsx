"use client";
import { useMemo, useState } from "react";
import { Search, Rocket } from "lucide-react";
import { useGetEvents, useGetSavedEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { cn } from "@/lib/utils";
import { EventListRow } from "@/components/attend/EventListRow";

// Ported from the figma-redesign branch. Clean adoption — every hook and field
// already exists in this repo. This design is a functional superset of the old
// "Product Launches" page: it adds Past Events and Bookmarked tabs (the latter
// via useGetSavedEvents). The old commented-out Gallery/Archive links are not in
// the figma design and stay dropped.

type Tab = "all" | "past" | "bookmarked";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "past", label: "Past Events" },
  { key: "bookmarked", label: "Bookmarked Events" },
];

const FORMATS = ["All", "Virtual", "Hybrid", "In-Person"] as const;
type Format = (typeof FORMATS)[number];

const isLaunchType = (t: string) => t === "PRODUCT_LAUNCH" || t === "LAUNCH";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export default function EventsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [fmt, setFmt] = useState<Format>("All");

  const { data, isLoading } = useGetEvents({
    search: query || undefined,
    status: tab === "past" ? "ENDED" : undefined,
    // Never leave this undefined — the backend defaults to 20 per page, and this list filters
    // client-side, so anything past the 20th event was invisible on the default tab.
    size: tab === "past" ? 50 : 100,
  });
  const apiEvents = data?.data?.events ?? [];

  const { data: savedResp } = useGetSavedEvents();
  const savedIds = useMemo(
    () => new Set((savedResp?.data?.events ?? []).map((e) => e.id)),
    [savedResp],
  );

  const visible = useMemo((): EventListItem[] => {
    const fmtKey = norm(fmt);
    return apiEvents
      .filter((e) => isLaunchType(e.eventType))
      .filter((e) => (fmt === "All" ? true : norm(e.format) === fmtKey))
      .filter((e) => {
        if (tab === "past") return e.status === "ENDED";
        if (tab === "bookmarked") return savedIds.has(e.id) && e.status !== "ENDED";
        return e.status !== "ENDED";
      });
  }, [apiEvents, fmt, tab, savedIds]);

  const emptyMessage =
    tab === "bookmarked"
      ? "No bookmarked events yet."
      : tab === "past"
        ? "No past events yet."
        : "No events match those filters.";

  return (
    <div className="flex flex-col gap-6">
      {/* Title + tagline live in the app bar for this section (NavShell SECTION_TITLE),
          per Figma — repeating them here stacked two near-identical headings. */}

      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-foreground/10 px-4 md:-mx-8 md:px-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or organiser"
            className="h-10 w-full rounded-full border border-foreground/5 bg-foreground/3 pl-10 pr-3 text-sm tracking-[-0.14px] text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFmt(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium tracking-[-0.12px] transition-colors",
                fmt === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/10 text-foreground/60 hover:bg-foreground/4",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <p className="py-8 text-center text-sm text-foreground/50">Loading events…</p>
      )}

      {!isLoading && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground/50">{emptyMessage}</p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visible.map((e) => (
          <EventListRow key={e.id} event={e} saved={savedIds.has(e.id)} fallbackIcon={Rocket} />
        ))}
      </div>
    </div>
  );
}
