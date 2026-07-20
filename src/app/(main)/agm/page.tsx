"use client";
import Link from "next/link";
import {
  Building2, CalendarDays, MapPin,
  Users, XCircle, Vote, ChevronRight, UserCheck,
} from "lucide-react";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

const fmtFormat = (f: string) => (f || "").toLowerCase().replace(/_/g, "-");

export default function AgmPage() {
  // Backend event type for AGMs/EGMs is "AGM_EGM" (not "AGM"). Filter defensively
  // too, in case the backend returns mixed types for an unrecognised value.
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  const agms = (data?.data?.events ?? []).filter((e) => e.eventType === "AGM_EGM");

  const upcoming = agms.filter((e) => e.status !== "ENDED" && e.status !== "CANCELLED");
  const past = agms.filter((e) => e.status === "ENDED");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Annual General Meetings</h1>
            <p className="text-sm text-muted-foreground">
              All upcoming AGMs on the Attend platform.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/agm/proxy-history">
            <Button variant="outline" size="sm">Proxy history</Button>
          </Link>
          <Link href="/agm/receipt">
            <Button variant="outline" size="sm">My receipts</Button>
          </Link>
          <Link href="/agm/minutes">
            <Button variant="outline" size="sm">Minutes</Button>
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Upcoming
              </h2>
              <ul className="space-y-4">
                {upcoming.map((e) => (
                  <AgmCard key={e.id} event={e} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Past
              </h2>
              <ul className="space-y-4">
                {past.map((e) => (
                  <AgmCard key={e.id} event={e} />
                ))}
              </ul>
            </section>
          )}

          {agms.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No AGMs available at this time.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgmCard({ event: e }: { event: EventListItem }) {
  const registered = e.registered;
  const isLive = e.status === "LIVE";

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Building2 className="h-5 w-5 text-slate-500" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {e.registerName || e.organizerName}
              </p>
              <h2 className="text-base font-semibold leading-snug text-foreground md:text-lg">
                {e.title}
              </h2>
            </div>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                Live
              </span>
            ) : registered ? (
              <Badge variant="success">Confirmed</Badge>
            ) : (
              <Badge variant="muted">{fmtFormat(e.format)}</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(e.date)} · {e.startTime}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {fmtFormat(e.format)}
            </span>
            {e.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {e.venue}
              </span>
            )}
            {e.maximumCapacity > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {e.maximumCapacity.toLocaleString()} capacity
              </span>
            )}
          </div>

          <div className="pt-1">
            {registered ? (
              <div className="flex gap-2">
                {e.format !== "VIRTUAL" && (
                  <Link href={`/agm/proxy?eventId=${e.id}`}>
                    <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
                      <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Proxy
                    </Button>
                  </Link>
                )}
                {!isLive && (
                  <Link href={`/agm/pre-vote?eventId=${e.id}`}>
                    <Button size="sm" className="flex-1 bg-slate-900 text-white hover:bg-slate-800 border-0">
                      <Vote className="h-3.5 w-3.5 mr-1.5" /> Pre-vote
                    </Button>
                  </Link>
                )}
                <Link href={`/events/${e.id}`}>
                  <Button size="sm" className="flex-1 bg-slate-900 text-white hover:bg-slate-800 border-0">
                    <ChevronRight className="h-3.5 w-3.5 mr-1.5" /> View
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">
                      Not yet registered for this AGM
                    </p>
                    <p className="text-xs text-red-600/80">
                      View the event to register. Pre-voting unlocks once your
                      registration is confirmed.
                    </p>
                  </div>
                </div>
                <Link href={`/events/${e.id}`}>
                  <Button variant="outline" size="sm" className="bg-slate-900 text-white hover:bg-slate-800 border-0 w-full">View</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
