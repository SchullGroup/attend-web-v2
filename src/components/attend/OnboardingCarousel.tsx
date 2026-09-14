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
    width: 1336,
    height: 1680,
    full: { src: "/auth/phone-1.png", width: 1168, height: 2419 },
  },
  {
    headline: ["Be there", "when it", "happens."],
    subtext: "Experience product launches and brand moments live, wherever you are.",
    image: "/auth/onboarding-slide-2.png",
    width: 1195,
    height: 1613,
    full: { src: "/auth/phone-2.png", width: 1195, height: 2465 },
  },
  {
    headline: ["Ideas", "deserve a", "stage."],
    subtext:
      "Join shareholder meetings, follow proceedings, participate in discussions & vote securely from anywhere.",
    image: "/auth/onboarding-slide-3.png",
    width: 1195,
    height: 1613,
    full: { src: "/auth/phone-3.png", width: 1195, height: 2465 },
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
          className="absolute inset-y-0 left-0 flex transition-transform duration-500 ease-out"
          style={{
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(-${index * (100 / SLIDES.length)}%)`,
          }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className="flex h-full shrink-0 flex-col items-center"
              style={{ width: `${100 / SLIDES.length}%` }}
            >
              <div className="flex w-full max-w-[342px] shrink-0 flex-col gap-6">
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

              {/* Phone mockup: two versions switched by ONE CSS media query, so the photo and its
                  placement always change together (a <picture> + separate layout query was tried
                  and a render caught them disagreeing: full-phone layout, cropped photo).
                  Under 1200px tall: the already-cropped phone, its straight bottom edge pinned ON
                  the card's bottom edge (Figma's bleed); short screens just crop more of it.
                  1200px+ (about browser zoom under 80% on a 1080p screen): the whole-phone photo
                  fits, centred in the free space. The track is absolute so slides get a height. */}
              <div className="mt-auto w-full max-w-[342px] shrink-0 pt-10 [@media(min-height:1200px)]:hidden">
                <Image
                  src={slide.image}
                  alt=""
                  width={slide.width}
                  height={slide.height}
                  sizes="342px"
                  className="block h-auto w-full"
                  priority={i === 0}
                />
              </div>
              <div className="my-auto hidden w-full max-w-[342px] shrink-0 py-10 [@media(min-height:1200px)]:block">
                <Image
                  src={slide.full.src}
                  alt=""
                  width={slide.full.width}
                  height={slide.full.height}
                  sizes="342px"
                  className="block h-auto w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
