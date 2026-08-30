"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Building2, Lightbulb, Rocket } from "lucide-react";
import { useGetMyEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "all" | "attended" | "rsvps" | "challenges";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attended", label: "Attended" },
  { key: "rsvps", label: "RSVPs" },
  { key: "challenges", label: "Challenges" },
];

const isChallenge = (t: string) => t === "HACKATHON" || t === "INNOVATION_CHALLENGE";
const isAgm = (t: string) => t === "AGM" || t === "AGM_EGM";
const MODULE_ICON = (t: string) => (isAgm(t) ? Building2 : isChallenge(t) ? Lightbulb : Rocket);

// Deterministic pastel tile per organiser, matching Home's approach — there's no
// per-organiser logo guaranteed from the API, so this is the fallback background.
const TILE_TINTS = ["#f9b6ff", "#8ba6ff", "#c3e1d0", "#dbe1c3", "#f6f6f6", "#e2e2e2"];
function tileTint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return TILE_TINTS[h % TILE_TINTS.length];
}

export default function MyEventsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const { data, isLoading } = useGetMyEvents();
  const apiEvents = data?.data?.events ?? [];

  const events = useMemo(() => {
    return apiEvents.filter((e: EventListItem) => {
      if (tab === "all") return true;
      if (tab === "attended") return e.status === "ENDED";
      if (tab === "rsvps") return e.registered && e.status !== "ENDED";
      if (tab === "challenges") return isChallenge(e.eventType);
      return true;
    });
  }, [apiEvents, tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          aria-label="Back to settings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-white text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-foreground/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">My Events</h1>
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[68px] animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/10 p-10 text-center text-sm text-foreground/50">
          Nothing here yet — browse events to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e: EventListItem) => {
            const organiser = e.registerName || e.organizerName;
            const Icon = MODULE_ICON(e.eventType);
            const href = isAgm(e.eventType)
              ? `/agm/${e.id}`
              : isChallenge(e.eventType)
                ? `/hackathon/${e.id}`
                : `/events/${e.id}`;
            return (
              <Link
                key={e.id}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                  style={{ backgroundColor: tileTint(organiser || e.title) }}
                >
                  {e.organizerLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.organizerLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-5 w-5 text-foreground/60" strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{e.title}</p>
                  <p className="flex items-center gap-1 text-xs text-foreground/60">
                    <span>By:</span>
                    <span className="truncate text-foreground/80">{organiser}</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
