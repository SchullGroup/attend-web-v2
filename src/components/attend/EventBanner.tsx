"use client";
import { useState } from "react";
import Image from "next/image";
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
        <>
          {/* Blurred backdrop: the SAME flyer, scaled up and blurred, filling every corner of
              the frame. This is what makes a portrait or square flyer (an AGM notice, a
              "launching soon" square) work in a wide banner without the crop that used to
              lose the logo/date text at the edges — and without the flat letterbox bars a
              plain object-contain leaves. `scale-125` pushes the blur's own soft edge outside
              the frame, so no lighter fringe shows at the boundary.

              Different from tier 2's logo fill on purpose: that tier samples the logo's own
              background colour instead of blurring it, because blurring averaged the mark's
              colours into a washed-out mush (see the note below). A flyer is a full-bleed
              design meant to read well blurred; a logo is a mark on a background and isn't. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flyerUrl!}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl"
          />
          {/* The real, uncropped flyer on top — object-contain, so nothing is ever cut off.
              `inset-[8%]` (not inset-0) shrinks the box it fits into a little on every side, on
              request 2026-09-15: at inset-0 a flyer close to the frame's own aspect ratio could
              fill it edge to edge and leave no blurred backdrop visible at all. Note this drops
              the usual `h-full w-full` — with all four inset offsets set and no explicit size,
              the browser stretches the image to exactly that box on its own; adding h-full/w-full
              back would size it against the outer frame instead and cancel the shrink. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flyerUrl!}
            alt=""
            className="absolute inset-[8%] object-contain"
            onError={() => setFlyerFailed(true)}
          />
        </>
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
        // next/image, not a raw <img>: it's one of two local files, so Next serves a
        // resized, modern-format variant rather than the full 1180x436 source on every
        // banner-less event and challenge page.
        <Image
          src={POSTER[mod]}
          alt=""
          fill
          sizes="(min-width: 768px) 960px, 100vw"
          className="object-cover"
        />
      )}

      {children}
    </div>
  );
}
