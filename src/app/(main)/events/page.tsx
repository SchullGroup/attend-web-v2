"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Rocket, Clock } from "lucide-react";
import { useGetEvents, useGetSavedEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { cn, formatDate } from "@/lib/utils";

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

// Deterministic pastel tile per organiser — matches Home's approach (no real
// per-organiser logo/branding available from the API yet).
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

export default function EventsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [fmt, setFmt] = useState<Format>("All");

  const { data, isLoading } = useGetEvents({
    search: query || undefined,
    status: tab === "past" ? "ENDED" : undefined,
    size: tab === "past" ? 50 : undefined,
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
        if (tab === "bookmarked") return savedIds.has(e.id);
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Launches &amp; Events
        </h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Product launches &amp; live events
        </p>
      </div>

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
            className="h-10 w-full rounded-full border border-foreground/5 bg-foreground/[0.03] pl-10 pr-3 text-sm tracking-[-0.14px] text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary"
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
                  : "border-foreground/10 text-foreground/60 hover:bg-foreground/[0.04]",
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
        {visible.map((e) => {
          const organiser = e.registerName || e.organizerName;
          return (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex gap-2.5 rounded-xl border border-foreground/[0.06] bg-white p-1.5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
            >
              <div
                className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                style={{ backgroundColor: tileTint(organiser || e.title) }}
              >
                {e.organizerLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.organizerLogo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Rocket className="h-6 w-6 text-foreground/60" strokeWidth={1.75} />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1 pr-2">
                <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                  {e.title}
                </p>
                <p className="flex items-center gap-1 text-xs text-foreground/60">
                  <span>By:</span>
                  <span className="text-foreground/80">{organiser}</span>
                </p>
                <p className="flex items-center gap-1 text-xs text-foreground/80">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(e.date)}, {fmtTime(e.startTime)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
