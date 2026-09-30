"use client";
import { MapPin } from "lucide-react";

// The venue block from the AGM frame: the address line above an embedded map.
//
// All the API gives us is `venue` as free text — there is no latitude/longitude or structured
// address on EventDetail — so the map is geocoded from that string. A precise venue
// ("20A Gerrard Road, Ikoyi, Lagos") places accurately; a vague one ("Head Office") will not,
// and that's a data limitation rather than something this component can fix.
//
// Two embed endpoints:
//   • with NEXT_PUBLIC_GOOGLE_MAPS_KEY set → the official, documented Maps Embed API.
//   • without → the keyless `output=embed` URL, which needs no setup and works today. It is
//     undocumented, so if Google ever drops it the fix is to provision a key; the "Open in
//     Maps" link below keeps the address usable either way.
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export function VenueMap({ venue }: { venue: string }) {
  const q = encodeURIComponent(venue);

  const embedSrc = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${q}`
    : `https://maps.google.com/maps?q=${q}&output=embed`;

  return (
    <section className="overflow-hidden rounded-xl border border-foreground/6 bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      {/* Address only. The embed renders Google's own "Open in Maps" control over the map, so
          a second link here just read as the same button twice. */}
      <div className="px-4 py-3">
        <p className="flex min-w-0 items-center gap-2 text-sm tracking-[-0.14px] text-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-foreground/50" />
          <span className="truncate">{venue}</span>
        </p>
      </div>

      <iframe
        src={embedSrc}
        title={`Map showing ${venue}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[220px] w-full border-0"
      />
    </section>
  );
}
