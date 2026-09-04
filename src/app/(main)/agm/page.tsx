"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Building2, Search, Clock } from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { Input } from "@/components/ui/Input";
import { AgmHero, AgmSubNav } from "@/components/attend/AgmSubNav";
import { cn, formatDate } from "@/lib/utils";

// Ported from the figma-redesign branch. Clean adoption — AgmSubNav/AgmHero and
// the Input component already exist here. The old page's per-card Proxy/Pre-vote
// CTAs are intentionally dropped: figma routes each card to /events/[id], whose
// detail page already surfaces "Appoint/Change Proxy" and pre-vote (gated on
// agmProxyEnabled), and the AgmSubNav pill row covers Proxy history / My receipts
// / Minutes. So no proxy/vote entry point is lost.

type StatusTab = "all" | "live" | "upcoming";
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
];

// Deterministic pastel tile per organiser, matching Home's approach (no real
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

export default function AgmPage() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");

  // Backend event type for AGMs/EGMs is "AGM_EGM" (not "AGM"). Filter defensively
  // too, in case the backend returns mixed types for an unrecognised value.
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  const agms = (data?.data?.events ?? []).filter(
    (e) => e.eventType === "AGM_EGM" && e.status !== "CANCELLED" && e.status !== "ENDED",
  );

  const visible = useMemo(() => {
    let list = agms;
    if (tab === "live") list = list.filter((e) => e.status === "LIVE");
    else if (tab === "upcoming") list = list.filter((e) => e.status !== "LIVE" && e.status !== "ENDED");
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.registerName || e.organizerName || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [agms, tab, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
        <span className="text-foreground">AGM</span>
        <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
        <span className="text-foreground/40">All AGMs</span>
      </div>

      <AgmHero />
      <AgmSubNav active="agms" />

      <Input
        leftIcon={<Search className="h-4 w-4" />}
        placeholder="Search for events"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto border-b border-foreground/10">
        {STATUS_TABS.map((t) => (
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
          No AGMs in this category yet.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visible.map((e: EventListItem) => (
          <AgmListCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function AgmListCard({ event: e }: { event: EventListItem }) {
  const organiser = e.registerName || e.organizerName;
  const isLive = e.status === "LIVE";

  return (
    <Link
      // The dedicated /agm/[id] route doesn't exist yet — AGM detail (agenda,
      // proxy/pre-vote entry points) is served by the shared /events/[id]
      // page today, same as before this retrofit.
      href={`/events/${e.id}`}
      className="flex items-center gap-2.5 rounded-xl border border-foreground/[0.06] bg-white p-1.5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <div
        className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
        style={{ backgroundColor: tileTint(organiser || e.title) }}
      >
        {e.organizerLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.organizerLogo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-6 w-6 text-foreground/60" strokeWidth={1.75} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1">
        <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
          {e.title}
        </p>
        <p className="flex items-center gap-1 text-xs text-foreground/80">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(e.date)}, {fmtTime(e.startTime)}
        </p>
      </div>
      {isLive && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
        </span>
      )}
      <span className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-foreground/60">
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
