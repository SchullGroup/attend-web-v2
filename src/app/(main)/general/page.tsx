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
    thumbnailColor:
      item.branding?.brandColor ||
      item.brandPrimary ||
      (item as any).organizerPrimaryColor ||
      "#2563eb",
    logoUrl: item.branding?.logoUrl || item.organizerLogo || null,
    image: item.flyerUrl || item.bannerUrl || undefined,
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

  const { data, isLoading } = useGetEvents({ size: 100, search: query || undefined });
  const apiEvents = data?.data?.events ?? [];

  const visible = useMemo((): EventCardData[] => {
    const fmtKey = norm(fmt);
    return apiEvents
      .filter((e) => {
        const t = (e.eventType || "").toUpperCase();
        return (
          t === "GENERAL" ||
          t === "GENERAL_EVENT" ||
          (!t.includes("AGM") &&
            !t.includes("EGM") &&
            !t.includes("HACKATHON") &&
            !t.includes("INNOVATION") &&
            !t.includes("LAUNCH"))
        );
      })
      .filter((e) => (fmt === "All" ? true : norm(e.format) === fmtKey))
      .map(apiToCard);
  }, [apiEvents, fmt]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">General Events</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          Conferences, meetings and roundtables.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or organiser"
            className="h-11 w-full rounded-[10px] border border-transparent bg-foreground/[0.04] pl-10 pr-3 text-sm tracking-[-0.14px] text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:bg-white"
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
                  : "border-foreground/[0.06] bg-white text-foreground/60 hover:bg-foreground/[0.04]",
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
            <div key={n} className="h-64 animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
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
