import type { CSSProperties } from "react";

// Figma's AGM layout: the panel is ~40% of the area right of the 259px sidebar.
export const PINNED_PANEL_VARS = {
  "--pinned-panel-w": "clamp(360px, calc((100vw - 259px) * 0.4), 560px)",
} as CSSProperties;

// 340 = sidebar 259 + main left padding 32 + gap before the divider 32 + ~17 scrollbar (100vw includes it).
export const PINNED_MAIN = "xl:w-[calc(100vw_-_340px_-_var(--pinned-panel-w))]";

// Same background as the Settings panel; top-16 tucks it under the 64px top bar.
export const PINNED_PANEL =
  "xl:fixed xl:top-16 xl:bottom-0 xl:right-0 xl:z-10 xl:w-[var(--pinned-panel-w)] xl:overflow-y-auto xl:border-l xl:border-foreground/10 xl:bg-[linear-gradient(180deg,#eef0f0_0%,#f6f7f7_100%)] xl:px-6 xl:py-6";
