"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronRight, CalendarDays } from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { AgmHero, AgmSubNav } from "@/components/attend/AgmSubNav";
import { formatDate } from "@/lib/utils";
import { MinutesSheet } from "@/components/attend/MinutesSheet";

// Figma opens minutes as a right-anchored sheet over this list, so picking one sets
// state rather than navigating. `?eventId=` still works for direct links.
function MinutesRouteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("eventId") ?? "";
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (urlEventId) setSelected(urlEventId);
  }, [urlEventId]);

  function close() {
    setSelected(null);
    if (urlEventId) router.replace("/agm/minutes");
  }

  return (
    <>
      <MinutesPicker onSelect={setSelected} />
      {selected && <MinutesSheet eventId={selected} open onClose={close} />}
    </>
  );
}

export default function MinutesPage() {
  return (
    <Suspense>
      <MinutesRouteInner />
    </Suspense>
  );
}

function MinutesPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  // Minutes access gates on a real RSVP (backend confirmed, 2026-08-17), so the picker
  // matches — `registered` alone includes shareholders who never actually RSVP'd. Falls
  // back to `registered` only until backend's `hasRsvped` field is live everywhere.
  const agms = (data?.data?.events ?? []).filter(
    (e: EventListItem) => e.eventType === "AGM_EGM" && (e.hasRsvped ?? e.registered),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
        <span className="text-foreground">AGM</span>
        <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
        <span className="text-foreground/40">Minutes</span>
      </div>

      <AgmHero />
      <AgmSubNav active="minutes" />

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Minutes</h2>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Select an AGM to read its finalised minutes.
        </p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-foreground/50">Loading…</p>
      ) : agms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You aren&apos;t registered for any AGMs yet. Minutes appear here once an AGM
          you attended has been finalised.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {agms.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e.id)}
              className="flex items-center gap-2.5 rounded-xl border border-foreground/[0.06] bg-white p-1.5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
            >
              <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-foreground/80">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(e.date)}
                </p>
              </div>
              <span className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-foreground/60">
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

