"use client";
import { useState } from "react";
import type { EventListItem } from "@/types";
import { cn, tileTint } from "@/lib/utils";

// The square artwork tile every list row uses. One component so all five lists resolve the
// organiser's imagery the same way — they had drifted into five different chains, and the two
// that skipped `branding.logoUrl` showed a bare icon for events that do have a logo.
//
// Ordering, same as the home cards and the detail-page banner:
//
//   flyerUrl → bannerUrl → branding.logoUrl → organizerLogo
//
// `branding.logoUrl` sits ahead of `organizerLogo` deliberately: on an AGM `organizerLogo` is
// the *registrar's* mark (Meristem), not the company holding the meeting, so a row that used
// `organizerLogo` alone wore the registrar's logo beside the company's name.

/** Every artwork URL an event can offer, best first, blanks dropped. */
export function eventArtwork(
  e: Pick<EventListItem, "flyerUrl" | "bannerUrl" | "branding" | "organizerLogo">,
): string[] {
  return [e.flyerUrl, e.bannerUrl, e.branding?.logoUrl, e.organizerLogo].filter(
    // An empty/whitespace string is what the API sends for "no logo", and it would otherwise
    // render as a permanently broken <img>.
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );
}

export function EventThumb({
  event: e,
  fallback,
  tint,
  className,
}: {
  event: Pick<
    EventListItem,
    "flyerUrl" | "bannerUrl" | "branding" | "organizerLogo" | "organizerName" | "registerName" | "title"
  >;
  /** Rendered when the event has no usable artwork at all — a module icon, or initials. */
  fallback: React.ReactNode;
  /** Defaults to the organiser's pastel tile tint, so the tile matches that organiser elsewhere. */
  tint?: string;
  /** Size and radius come from the host row. */
  className?: string;
}) {
  // Which URLs have actually 404'd, tracked by value rather than as an index into the list.
  // That way a refetch which fills in a flyer can't leave the cursor pointing at the wrong tier,
  // and no reset effect is needed.
  const [failed, setFailed] = useState<string[]>([]);

  const src = eventArtwork(e).find((u) => !failed.includes(u)) ?? null;

  // Falling through on error is the point: the old rows set `display:none` on a broken image,
  // which left an empty coloured square, because the icon fallback lived in the other branch of
  // the ternary and so could never render.
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden", className)}
      style={{ backgroundColor: tint ?? tileTint(e.registerName || e.organizerName || e.title) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          // Fill edge to edge. Containing a logo reads as a sticker on a mismatched pastel;
          // cropping eats the logo's own built-in whitespace, which is what should go.
          className="h-full w-full object-cover"
          onError={() => setFailed((f) => (f.includes(src) ? f : [...f, src]))}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
