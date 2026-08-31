import Link from "next/link";
import { ModuleBadge } from "./ModuleBadge";
import { Badge } from "@/components/ui/Badge";
import { formatDate, initialsFor, formatEventFormat } from "@/lib/utils";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

export interface EventCardData {
  id: string;
  title: string;
  organiser: string;
  module: string;
  thumbnailColor?: string;
  image?: string;
  status: string;
  date: string;
  startTime: string;
  endTime?: string;
  venue?: string;
  rsvpCount?: number;
  rsvpStatus?: string | null;
  registered?: boolean;
  format: string;
}

interface Props {
  event: EventCardData;
  href?: string;
}

export function EventCard({ event, href }: Props) {
  const link = href || `/events/${event.id}`;
  const bgColor = event.thumbnailColor ?? "#2563eb";
  const isRegistered =
    event.rsvpStatus === "confirmed" || event.registered === true;

  return (
    <Link
      href={link}
      className="group block overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-44 overflow-hidden" style={{ background: bgColor }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.image ?? `/posters/${event.id}.jpg`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute -right-6 -bottom-10 select-none text-[140px] font-black leading-none text-white/10">
          {initialsFor(event.organiser)}
        </div>
        <div className="relative flex h-full items-start justify-between p-4">
          <ModuleBadge module={event.module} solid />
          {(event.status === "live" || event.status === "LIVE") && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            {event.organiser}
          </p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary">
          {event.title}
        </h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(event.date)}
          </div>
          {event.startTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {event.startTime}
              {event.endTime ? ` – ${event.endTime}` : ""}
            </div>
          )}
          {event.venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          {event.rsvpCount != null ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {event.rsvpCount.toLocaleString()} attending
            </div>
          ) : (
            <span />
          )}
          {isRegistered ? (
            <Badge variant="success">Confirmed</Badge>
          ) : event.rsvpStatus === "waitlisted" ? (
            <Badge variant="warning">Waitlisted</Badge>
          ) : (
            <Badge variant="muted">{formatEventFormat(event.format)}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
