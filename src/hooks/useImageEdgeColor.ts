"use client";
import { useEffect, useState } from "react";

/**
 * The background colour of an image, read from its edge pixels.
 *
 * Used by `EventBanner` to fill a banner with the *exact* colour a logo sits on — an Earth
 * photo on black fills the banner black, a wordmark on white fills it white.
 *
 * Why edges: a logo's corners and edge midpoints are almost always backdrop rather than mark,
 * so the most common colour among them is the background. Averaging the whole image instead
 * gives the average of the *artwork* — which is how an earlier blurred-fill attempt turned a
 * black-backed logo into purple-grey mush.
 *
 * Returns `null` while loading, and stays `null` on any failure or when the edges are
 * transparent (a cut-out PNG has no background colour to find). Callers keep their own fallback.
 */

// Small enough to be nearly free to draw and to smooth out JPEG noise; big enough that edge
// samples aren't blending in the middle of the mark.
const SAMPLE = 32;
// Below this alpha the pixel is see-through, so it tells us nothing about a background colour.
const MIN_ALPHA = 200;

function sampleUrlFor(src: string): string {
  // A same-origin/relative path can be read from a canvas directly. Anything absolute is
  // cross-origin and would taint the canvas, so it goes through the image proxy — the same
  // route `dom-to-pdf` uses, and for the same reason. It only permits the asset hosts we use,
  // so an unexpected host fails and the caller falls back.
  if (src.startsWith("/")) return src;
  return `/api/proxy-image?url=${encodeURIComponent(src)}`;
}

export function useImageEdgeColor(src?: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    setColor(null);
    if (!src) return;

    let cancelled = false;
    const img = new Image();
    // Harmless when the sample URL is same-origin, and required if it ever isn't.
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);

        const max = SAMPLE - 1;
        const mid = Math.floor(max / 2);
        // Four corners plus the midpoint of each edge — enough to out-vote a mark that happens
        // to reach one corner, without walking the whole border.
        const points: [number, number][] = [
          [0, 0], [max, 0], [0, max], [max, max],
          [mid, 0], [mid, max], [0, mid], [max, mid],
        ];

        // One read of the whole (tiny) bitmap, then index into it — cheaper and clearer than
        // eight separate 1x1 getImageData calls.
        const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

        const tally = new Map<string, { n: number; r: number; g: number; b: number }>();
        for (const [x, y] of points) {
          const i = (y * SAMPLE + x) * 4;
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < MIN_ALPHA) continue;
          // Quantise to 16-level buckets so near-identical pixels (compression noise, subtle
          // gradients) count as one colour instead of eight separate ones.
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const hit = tally.get(key);
          if (hit) {
            hit.n += 1; hit.r += r; hit.g += g; hit.b += b;
          } else {
            tally.set(key, { n: 1, r, g, b });
          }
        }

        if (tally.size === 0) return; // every edge pixel transparent — no background to report
        const win = [...tally.values()].sort((a, b) => b.n - a.n)[0];
        // Average the winning bucket's real values, so the result is the true colour rather
        // than the quantised approximation of it.
        const rgb = [win.r, win.g, win.b].map((c) => Math.round(c / win.n));
        if (!cancelled) setColor(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
      } catch {
        // A tainted canvas throws here — leave the colour null and let the caller fall back.
      }
    };

    img.src = sampleUrlFor(src);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}
