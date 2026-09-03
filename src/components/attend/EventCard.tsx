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
  // The register's logo from the event's branding payload. Often null — the admin
  // hasn't uploaded one — so every use has to degrade to the organiser name alone.
  logoUrl?: string | null;
  // The event flyer (flyerUrl, falling back to bannerUrl). Fills the card header when
  // present; otherwise the header falls back to the organiser's brand colour.
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
      className="group block overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      {/* When the event has a flyer it fills the card header (cropped to fit); otherwise the
          header falls back to the organiser's brand colour with their initials as a watermark.
          The organiser's logo (if any) and name sit pinned along the bottom either way. */}
      <div className="relative h-44 overflow-hidden" style={{ background: bgColor }}>
        {event.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              // A broken flyer URL must fall back to the brand-colour header, not a torn image.
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Keep the bottom-pinned organiser name/logo legible over any flyer. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute -right-6 -bottom-10 select-none text-[140px] font-black leading-none text-white/10">
            {initialsFor(event.organiser)}
          </div>
        )}
        <div className="relative flex h-full items-start justify-between p-4">
          <ModuleBadge module={event.module} solid />
          {(event.status === "live" || event.status === "LIVE") && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
          {event.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.logoUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-md bg-white/95 object-cover shadow-sm"
              // A broken logo URL must not leave a torn-image icon over the banner.
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-white/80">
            {event.organiser}
          </p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary">
          {event.title}
        </h3>
        <div className="space-y-1.5 text-xs text-foreground/60">
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
        <div className="flex items-center justify-between border-t border-foreground/[0.06] pt-3">
          {event.rsvpCount != null ? (
            <div className="flex items-center gap-1.5 text-xs text-foreground/60">
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
