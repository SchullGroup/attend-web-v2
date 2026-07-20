"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { EventCard, EventCardData } from "@/components/attend/EventCard";
import { cn } from "@/lib/utils";

const FORMATS = ["All", "Virtual", "Hybrid", "In-Person"] as const;
type Format = (typeof FORMATS)[number];

function apiToCard(item: EventListItem): EventCardData {
  return {
    id: item.id,
    title: item.title,
    organiser: item.registerName || item.organizerName,
    module: item.eventType,
    thumbnailColor: "#2563eb",
    image: item.organizerLogo || undefined,
    status: item.status,
    date: item.date,
    startTime: item.startTime,
    venue: item.venue,
    registered: item.registered,
    format: item.format,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export default function GeneralEventsPage() {
  const [query, setQuery] = useState("");
  const [fmt, setFmt] = useState<Format>("All");

  const { data, isLoading } = useGetEvents({ search: query || undefined });
  const apiEvents = data?.data?.events ?? [];

  const visible = useMemo((): EventCardData[] => {
    const fmtKey = norm(fmt);
    return apiEvents
      .filter((e) => e.eventType === "GENERAL" || e.eventType === "GENERAL_EVENT")
      .filter((e) => (fmt === "All" ? true : norm(e.format) === fmtKey))
      .map(apiToCard);
  }, [apiEvents, fmt, query]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">General Events</h1>
        <p className="text-sm text-muted-foreground">
          Conferences, meetings and roundtables.
        </p>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or organiser"
            className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFmt(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                fmt === f
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-muted-foreground hover:bg-muted",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No general events right now.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
