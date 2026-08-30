"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Building2, Lightbulb, Rocket, CalendarDays, Clock } from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { cn, formatDate } from "@/lib/utils";

type Tab = "all" | "agm" | "innovation" | "launch";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "agm", label: "AGM" },
  { key: "innovation", label: "Innovation" },
  { key: "launch", label: "Launch Events" },
];

const isAgm = (t: string) => t === "AGM" || t === "AGM_EGM";
const isInnovation = (t: string) => t === "HACKATHON" || t === "INNOVATION_CHALLENGE";
const isLaunch = (t: string) => !isAgm(t) && !isInnovation(t);

const MODULE_ICON: Record<string, typeof Building2> = {
  agm: Building2,
  innovation: Lightbulb,
  launch: Rocket,
};
function moduleOf(t: string): "agm" | "innovation" | "launch" {
  if (isAgm(t)) return "agm";
  if (isInnovation(t)) return "innovation";
  return "launch";
}

// Deterministic pastel tile per organiser, matching the mobile app's approach
// (no real per-organiser logo/branding available from the API yet).
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

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("all");
  const { data: evResp, isLoading } = useGetEvents();
  const allEvents = evResp?.data?.events ?? [];

  const visible = useMemo(() => {
    const active = allEvents.filter((e) => e.status !== "ENDED");
    if (tab === "all") return active;
    return active.filter((e) => moduleOf(e.eventType) === tab);
  }, [allEvents, tab]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
          <span className="text-foreground">Home</span>
          <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
          <span className="text-foreground/40">All events</span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
            All events
          </h1>
          <p className="text-sm tracking-[-0.14px] text-foreground/60">
            View all your upcoming and live events
          </p>
        </div>
      </div>

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

      {isLoading && (
        <p className="py-8 text-center text-sm text-foreground/50">Loading events…</p>
      )}

      {!isLoading && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground/50">
          No events in this category yet.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visible.map((e: EventListItem) => {
          const mod = moduleOf(e.eventType);
          const Icon = MODULE_ICON[mod];
          const organiser = e.registerName || e.organizerName;
          const href = isAgm(e.eventType)
            ? `/agm/${e.id}`
            : isInnovation(e.eventType)
              ? `/hackathon/${e.id}`
              : `/events/${e.id}`;
          return (
            <Link
              key={e.id}
              href={href}
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
                  <Icon className="h-6 w-6 text-foreground/60" strokeWidth={1.75} />
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
