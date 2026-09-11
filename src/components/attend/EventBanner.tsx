"use client";
import { useState } from "react";
import { cn, tileTint } from "@/lib/utils";
import { POSTER_BY_MODULE, type PosterModule } from "@/lib/posters";
import { useImageEdgeColor } from "@/hooks/useImageEdgeColor";

// The detail-page banner, as a three-tier fallback so it never renders as an empty slab:
//
//   1. the organiser's flyer/banner        → fills the frame
//   2. no flyer → the company logo        → centred on its own background colour, sampled from
//                                            the logo's edge pixels (see useImageEdgeColor)
//   3. no logo either → a stock poster    → chosen by module
//
// Shared by the event detail page and the challenge detail page; they differ only in aspect
// ratio, which is passed in.
// The poster map moved to lib/posters so the Home cards share it — they use the same stock
// artwork for the same "no logo either" case, and two copies would drift.
export type BannerModule = PosterModule;
const POSTER = POSTER_BY_MODULE;

export function EventBanner({
  flyerUrl,
  logoUrl,
  module: mod,
  seed,
  className,
  children,
}: {
  /** Tier 1 — the real artwork. */
  flyerUrl?: string | null;
  /** Tier 2 — `branding.logoUrl` before `organizerLogo`: on an AGM the latter is the registrar's
   *  mark (Meristem), not the company holding the meeting. */
  logoUrl?: string | null;
  module: BannerModule;
  /** Seeds the pastel base layer — pass the organiser name so it matches that event's logo tile
   *  elsewhere in the app. */
  seed: string;
  /** Aspect ratio and radius come from the host page. */
  className?: string;
  /** Overlays: LIVE badge, play control, stream iframe. */
  children?: React.ReactNode;
}) {
  // A broken URL falls through to the next tier rather than leaving a hole. Tracked as state,
  // not by hiding the node — an earlier version set `display:none` on error, which left the
  // frame empty because the fallback lives in the other branch and could never render.
  const [flyerFailed, setFlyerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const showFlyer = !!flyerUrl && !flyerFailed;
  const showLogo = !showFlyer && !!logoUrl && !logoFailed;
  const showPoster = !showFlyer && !showLogo;

  // Tier 2's fill: the logo's *actual* background colour, read from its edge pixels, so an Earth
  // photo on black gives a black banner and a wordmark on white gives a white one.
  //
  // An earlier attempt filled the frame with a blurred, over-scaled copy of the logo instead.
  // That looked like it would work but doesn't: blurring averages the whole image, so the
  // black-backed logo above came out washed-out purple-grey. The average of the artwork is not
  // the colour of its background.
  //
  // Null while sampling, and on failure (proxy refuses the host, image won't load, or the logo
  // is a cut-out PNG with transparent edges and so has no background colour at all) — the
  // pastel below stands in for all of those.
  const sampled = useImageEdgeColor(showLogo ? logoUrl : null);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: (showLogo && sampled) || tileTint(seed) }}
    >
      {showFlyer && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flyerUrl!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFlyerFailed(true)}
        />
      )}

      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt=""
          className="absolute inset-0 m-auto max-h-[64%] max-w-[54%] object-contain"
          onError={() => setLogoFailed(true)}
        />
      )}

      {showPoster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={POSTER[mod]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {children}
    </div>
  );
}
