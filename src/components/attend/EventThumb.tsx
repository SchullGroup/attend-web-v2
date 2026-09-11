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

type ArtworkSource = Pick<EventListItem, "flyerUrl" | "bannerUrl" | "branding" | "organizerLogo">;

// An empty/whitespace string is what the API sends for "no logo", and it would otherwise
// render as a permanently broken <img>.
const present = (u: string | null | undefined): u is string =>
  typeof u === "string" && u.trim().length > 0;

/** Every artwork URL an event can offer, best first, blanks dropped. */
export function eventArtwork(e: ArtworkSource): string[] {
  return [e.flyerUrl, e.bannerUrl, e.branding?.logoUrl, e.organizerLogo].filter(present);
}

/**
 * The same candidates with the company logo first — for tiles that shrink the image onto white
 * (`fit="contain"`). There the logo IS the intended content; a flyer photo shrunk into a 44px
 * box just reads as an unrecognisable thumbnail. Flyers stay as the fallback.
 */
export function logoFirstArtwork(e: ArtworkSource): string[] {
  return [e.branding?.logoUrl, e.organizerLogo, e.flyerUrl, e.bannerUrl].filter(present);
}

export function EventThumb({
  event: e,
  fallback,
  tint,
  className,
  fit = "cover",
}: {
  event: ArtworkSource & Pick<EventListItem, "organizerName" | "registerName" | "title">;
  /** Rendered when the event has no usable artwork at all — a module icon, or initials. */
  fallback: React.ReactNode;
  /** Defaults to the organiser's pastel tile tint, so the tile matches that organiser elsewhere. */
  tint?: string;
  /** Size and radius come from the host row. */
  className?: string;
  /**
   * `cover` (default) fills the tile edge to edge — what Home and the module lists use, since a
   * contained logo on a pastel read as a sticker there.
   *
   * `contain` is the Settings lists' treatment, per the Figma frames: the logo shrunk to fit on
   * a white tile with a thin border, preferring logos over flyers (see `logoFirstArtwork`).
   * The tint still applies when there's no image, so the initials fallback stays legible.
   */
  fit?: "cover" | "contain";
}) {
  // Which URLs have actually 404'd, tracked by value rather than as an index into the list.
  // That way a refetch which fills in a flyer can't leave the cursor pointing at the wrong tier,
  // and no reset effect is needed.
  const [failed, setFailed] = useState<string[]>([]);

  const contain = fit === "contain";
  const candidates = contain ? logoFirstArtwork(e) : eventArtwork(e);
  const src = candidates.find((u) => !failed.includes(u)) ?? null;
  const whiteTile = contain && !!src;

  // Falling through on error is the point: the old rows set `display:none` on a broken image,
  // which left an empty coloured square, because the fallback lived in the other branch of the
  // ternary and so could never render.
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        whiteTile && "border border-foreground/10",
        className,
      )}
      style={{
        backgroundColor: whiteTile
          ? "#fff"
          : (tint ?? tileTint(e.registerName || e.organizerName || e.title)),
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cn("h-full w-full", contain ? "object-contain p-1.5" : "object-cover")}
          onError={() => setFailed((f) => (f.includes(src) ? f : [...f, src]))}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
