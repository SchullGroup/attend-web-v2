"use client";
import { Children, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A horizontally scrolling row of cards with dot pagination underneath.
 *
 * Replaces the bare `overflow-x-auto` rows the Home carousels used. Those relied on the
 * browser's own scrollbar as the only affordance, and on Windows Chrome that scrollbar is
 * always visible — a grey track under every row, which appears nowhere in the design. The
 * design shows small dots instead, the active one stretched into a pill.
 *
 * Dots are per **page**, not per card — one dot for each screenful. That's what gives three
 * dots for a list of eight cards, matching the frame, and it keeps the dot row short however
 * many events come back.
 *
 * Scroll stays the real interaction (drag, wheel, trackpad, keyboard); the dots report and
 * jump. Hiding the scrollbar removes the only visual cue that a row scrolls at all, so the
 * dots are not decoration — don't drop them and keep `.no-scrollbar`.
 */
/**
 * How many screenfuls of cards there are.
 *
 * `ceil`, NOT `round` — this was a real bug. Four 300px cards in a ~900px row is 1.41
 * screenfuls, which `round` reported as **1 page**, so the dots hid themselves and autoplay
 * never started: the Live now row looked like it had no carousel at all, even though it scrolled.
 *
 * The 2px slack is what `round` was there for in the first place — a sub-pixel difference
 * between scrollWidth and clientWidth is normal at some zoom levels, and without the slack
 * `ceil` would invent a second, empty page for a row that fits exactly.
 */
function pageCountOf(el: HTMLElement): number {
  return Math.max(1, Math.ceil((el.scrollWidth - 2) / Math.max(1, el.clientWidth)));
}

/**
 * Which dot to light up, measured across the real scrollable range rather than in
 * viewport-width steps.
 *
 * The last page is usually a partial one — with 1.41 screenfuls there is only 0.41 of a
 * viewport left to scroll — so `scrollLeft / clientWidth` can never reach 1, and the final dot
 * would never activate however far the user scrolled.
 */
function pageFromScroll(el: HTMLElement, pages: number): number {
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0 || pages < 2) return 0;
  return Math.round((el.scrollLeft / maxScroll) * (pages - 1));
}

/** Inverse of `pageFromScroll`, so clicking the last dot actually reaches the end. */
function scrollLeftForPage(el: HTMLElement, page: number, pages: number): number {
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0 || pages < 2) return 0;
  return (maxScroll * page) / (pages - 1);
}

export function CardCarousel({
  children,
  className,
  label,
  autoPlayMs = 5000,
}: {
  children: React.ReactNode;
  className?: string;
  /** Names the row for screen readers, e.g. "Live now" — the dots reference it. */
  label: string;
  /** Time on each page. Pass 0 to disable sliding entirely. */
  autoPlayMs?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  // Autoplay stops for good once the user takes over — pointer down, wheel, touch, or a dot.
  // Resuming would fight them: the row would drift off whatever card they had just chosen.
  const [userTookOver, setUserTookOver] = useState(false);
  const [hovering, setHovering] = useState(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const pages = pageCountOf(el);
    setPageCount(pages);
    setPage(pageFromScroll(el, pages));
  }, []);

  // Re-measure when the row resizes or gains/loses cards — cards arrive after the query
  // resolves, so measuring once on mount would always read the empty width.
  //
  // Keyed on the child COUNT, not on `children` itself: that's a fresh array on every render,
  // so the observer would be torn down and rebuilt continuously.
  const childCount = Children.count(children);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, childCount]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    setPage(pageFromScroll(el, pageCount));
  }

  function goTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: scrollLeftForPage(el, i, pageCount), behavior: "smooth" });
  }

  // Slide on a timer, wrapping back to the first page at the end.
  //
  // Held back in four cases, all of which would otherwise be actively annoying:
  //   • one page — nothing to slide
  //   • the user has scrolled or picked a dot — never yank the row away from their choice
  //   • the pointer is over the row — they're reading or about to click a card
  //   • the OS asks for reduced motion — an unprompted animation loop is exactly what that
  //     setting is for, and a carousel that moves on its own is a common migraine trigger
  useEffect(() => {
    if (autoPlayMs <= 0 || pageCount < 2 || userTookOver || hovering) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      // Read the live page from the DOM rather than closing over `page`, so the interval
      // doesn't need to be torn down and recreated on every advance.
      const current = pageFromScroll(el, pageCount);
      const next = current + 1 >= pageCount ? 0 : current + 1;
      el.scrollTo({ left: scrollLeftForPage(el, next, pageCount), behavior: "smooth" });
    }, autoPlayMs);

    return () => clearInterval(id);
  }, [autoPlayMs, pageCount, userTookOver, hovering]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        // Pointer/wheel/touch — not `onScroll`, which the autoplay's own smooth scroll fires
        // too and would therefore use to switch itself off after one slide.
        onPointerDown={() => setUserTookOver(true)}
        // Horizontal intent only. Wheel events bubble from whatever is under the cursor, so
        // treating any wheel as a takeover meant simply scrolling the page past a carousel
        // killed its sliding for the rest of the session.
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setUserTookOver(true);
        }}
        onTouchStart={() => setUserTookOver(true)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        // Keyboard scrolling counts as taking over, and a focused row must stop moving or the
        // card under the cursor changes between reading it and pressing Enter.
        onKeyDown={() => setUserTookOver(true)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        className={cn("no-scrollbar flex snap-x gap-4 overflow-x-auto", className)}
      >
        {children}
      </div>

      {/* One page means nothing to page through, so the dots would be a control that does
          nothing. */}
      {pageCount > 1 && (
        <div className="flex items-center gap-1.5" role="tablist" aria-label={`${label} pages`}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`${label}: page ${i + 1} of ${pageCount}`}
              onClick={() => {
                setUserTookOver(true);
                goTo(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === page ? "w-5 bg-foreground" : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
