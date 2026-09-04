"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Figma "Web - Redesign" onboarding panel — three slides, one per app module, cycling
// automatically. Owns its own timer so the (auth) layout around it can stay a server
// component. Copy and images read directly off the three supplied frames; slide 3's
// subtext is intentionally identical to slide 1's — the frame has it that way and the
// user confirmed to keep it verbatim rather than write new copy.
const SLIDES = [
  {
    headline: ["Every", "voice", "counts."],
    subtext:
      "Join shareholder meetings, follow proceedings, participate in discussions & vote securely from anywhere.",
    image: "/auth/onboarding-slide-1.png",
  },
  {
    headline: ["Be there", "when it", "happens."],
    subtext: "Experience product launches and brand moments live, wherever you are.",
    image: "/auth/onboarding-slide-2.png",
  },
  {
    headline: ["Ideas", "deserve a", "stage."],
    subtext:
      "Join shareholder meetings, follow proceedings, participate in discussions & vote securely from anywhere.",
    image: "/auth/onboarding-slide-3.png",
  },
] as const;

export function OnboardingCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Progress dots — now tracking the active slide instead of a hardcoded first dot. */}
      <div className="relative z-10 flex w-14 items-center gap-1">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-[5px] flex-1 rounded-full transition-colors duration-500",
              i === index ? "bg-white" : "bg-white/10"
            )}
          />
        ))}
      </div>

      <div className="relative z-10 mt-14 w-full max-w-[342px] flex-1 overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(-${index * (100 / SLIDES.length)}%)`,
          }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className="flex shrink-0 flex-col items-center"
              style={{ width: `${100 / SLIDES.length}%` }}
            >
              <div className="flex w-full max-w-[342px] flex-col gap-6">
                <h1
                  className="whitespace-pre-line text-white"
                  style={{
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    fontSize: 80,
                    lineHeight: 0.8,
                    letterSpacing: -3.2,
                  }}
                >
                  {slide.headline.join("\n")}
                </h1>
                <p className="text-sm leading-[1.4] tracking-[-0.28px] text-white/80">
                  {slide.subtext}
                </p>
              </div>

              {/* Phone mockup — bleeds off the bottom of the card, per Figma's overflow-clip.
                  `fill` (rather than fixed width/height) because the three exports don't
                  share one aspect ratio; object-cover crops each to the same on-screen box. */}
              <div className="relative mt-10 h-[420px] w-[295px] max-w-full flex-1">
                <Image
                  src={slide.image}
                  alt=""
                  fill
                  sizes="295px"
                  className="object-cover object-top"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
