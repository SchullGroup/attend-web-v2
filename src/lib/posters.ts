// The stock "HeroCard" posters, used wherever an event has no artwork of its own.
//
// Shared so the detail-page banner (`EventBanner`) and the Home cards can't drift apart on
// which poster a module gets. Both are 1180x436 banner photographs, paired to the module they
// suit; AGM, Launch and General share the auditorium shot because all three are podium events.
//
// These are local files under /public, so they always load — anything falling through to here
// gets a real image rather than an empty tinted box.

export type PosterModule = "AGM" | "HACKATHON" | "LAUNCH" | "GENERAL";

// .webp, not the original .png — same look, ~93% smaller (867KB/765KB -> 63KB/53KB),
// converted 2026-09-14. PNG is a lossless format meant for flat graphics; these are
// photographs, where WebP's lossy encoding is nearly indistinguishable at this quality
// and a fraction of the size. The .png originals are unused now and can be deleted.
export const POSTER_BY_MODULE: Record<PosterModule, string> = {
  HACKATHON: "/posters/hero-card-workshop.webp",
  AGM: "/posters/hero-card-auditorium.webp",
  LAUNCH: "/posters/hero-card-auditorium.webp",
  GENERAL: "/posters/hero-card-auditorium.webp",
};

/** For callers holding a raw `eventType` rather than a resolved module. */
export function posterForEventType(eventType: string): string {
  const t = (eventType || "").toUpperCase();
  if (t === "AGM" || t === "AGM_EGM") return POSTER_BY_MODULE.AGM;
  if (t === "HACKATHON" || t === "INNOVATION_CHALLENGE") return POSTER_BY_MODULE.HACKATHON;
  if (t === "GENERAL" || t === "GENERAL_EVENT") return POSTER_BY_MODULE.GENERAL;
  return POSTER_BY_MODULE.LAUNCH;
}
