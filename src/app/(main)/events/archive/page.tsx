"use client";
import Link from "next/link";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { Badge } from "@/components/ui/Badge";
import { formatDate, initialsFor } from "@/lib/utils";

const EVENT_COLOR: Record<string, string> = {
  AGM_EGM: "#1a6b3c",
  PRODUCT_LAUNCH: "#f97316",
  INNOVATION_CHALLENGE: "#9333ea",
  HACKATHON: "#9333ea",
  GENERAL_EVENT: "#2563eb",
};
const TYPE_LABEL: Record<string, string> = {
  AGM_EGM: "AGM",
  PRODUCT_LAUNCH: "Launch",
  INNOVATION_CHALLENGE: "Innovation",
  HACKATHON: "Hackathon",
  GENERAL_EVENT: "General",
};

export default function ArchivePage() {
  const { data, isLoading } = useGetEvents({ status: "ENDED", size: 50 });
  const events = (data?.data?.events ?? []).filter((e) => e.status === "ENDED");

  return (
    <div className="space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Event archive</h1>
        <p className="text-sm text-muted-foreground">
          Catch up on past events with full recordings and presentation decks.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No past events yet. Recordings appear here after events end.
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const organiser = e.registerName || e.organizerName;
            return (
              <li
                key={e.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 md:flex-row md:items-center md:gap-5"
              >
                <Link
                  href={`/events/${e.id}`}
                  className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold text-white md:w-40"
                  style={{ background: EVENT_COLOR[e.eventType] ?? "#2563eb" }}
                >
                  {initialsFor(organiser)}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayCircle className="h-9 w-9 text-white" />
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {organiser}
                      </p>
                      <h2 className="text-sm font-semibold text-foreground md:text-base">
                        <Link href={`/events/${e.id}`} className="hover:text-primary">{e.title}</Link>
                      </h2>
                    </div>
                    <Badge variant="muted">{TYPE_LABEL[e.eventType] ?? e.eventType}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ended {formatDate(e.date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
