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
    box: { x: 14, y: 68, w: 1194, h: 1612 },
    full: { src: "/auth/phone-1.png", width: 1168, height: 2419, box: { x: 10, y: 10, w: 1148, h: 2399 } },
  },
  {
    headline: ["Be there", "when it", "happens."],
    subtext: "Experience product launches and brand moments live, wherever you are.",
    image: "/auth/onboarding-slide-2.png",
    width: 1195,
    height: 1613,
    box: { x: 0, y: 0, w: 1194, h: 1613 },
    full: { src: "/auth/phone-2.png", width: 1195, height: 2465, box: { x: 10, y: 0, w: 1175, h: 2430 } },
  },
  {
    headline: ["Ideas", "deserve a", "stage."],
    subtext:
      "Join shareholder meetings, follow proceedings, participate in discussions & vote securely from anywhere.",
    image: "/auth/onboarding-slide-3.png",
    width: 1195,
    height: 1613,
    box: { x: 0, y: 0, w: 1194, h: 1613 },
    full: { src: "/auth/phone-3.png", width: 1195, height: 2465, box: { x: 10, y: 0, w: 1175, h: 2430 } },
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

      <div className="relative z-10 mt-8 w-full max-w-[342px] flex-1 overflow-hidden">
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
              {/* mt-auto on the TEXT, not the phone: text and phone travel together, anchored to the
                  bottom, so any extra height goes above the headline — Figma keeps the text ~40px
                  above the phone rather than stranding it at the top of the card. */}
              <div className="mt-auto flex w-full max-w-[342px] shrink-0 flex-col gap-6">
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
                  Under 1200px tall: the already-cropped phone, its straight bottom edge ON the
                  card's bottom edge (Figma's bleed); short screens just crop more of it. It sits in
                  a frame of one shared height so all three slides show the phone at the same size
                  and height — the exports are cut differently (see PhoneImage).
                  1200px+ (about browser zoom under 80% on a 1080p screen): the whole-phone photo,
                  centred together with the text (text mt-auto, phone mb-auto).
                  The track is absolute so slides get a real height. */}
              <div className="w-full max-w-[342px] shrink-0 pt-10 [@media(min-height:1200px)]:hidden">
                <div className="w-full overflow-hidden" style={{ aspectRatio: CROPPED_FRAME }}>
                  <PhoneImage
                    src={slide.image}
                    width={slide.width}
                    height={slide.height}
                    box={slide.box}
                    priority={i === 0}
                  />
                </div>
              </div>
              <div className="mb-auto hidden w-full max-w-[342px] shrink-0 py-10 [@media(min-height:1200px)]:block">
                <div
                  className="w-full"
                  style={{ aspectRatio: `${slide.full.box.w} / ${slide.full.box.h}` }}
                >
                  <PhoneImage
                    src={slide.full.src}
                    width={slide.full.width}
                    height={slide.full.height}
                    box={slide.full.box}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type PhoneBox = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

// Shared frame for the cropped exports. Measured by solid pixels, all three phones are 1194 source
// px wide and 1612–1613 tall, so one frame fits them all; the extra row on slides 2/3 is past the
// card edge anyway.
const CROPPED_FRAME = "1194 / 1612";

// The exports aren't cut alike — slide 1's file carries a soft shadow and transparent padding
// around the phone, 2 and 3 don't — so sizing the FILE to the frame made slide 1's phone ~7%
// smaller and sit lower. This sizes by the phone's own box instead (measured on solid pixels, so
// the shadow doesn't count): the file is scaled so the box fills the frame's width, and shifted so
// the box's top-left meets the frame's. Percentage margins resolve against the frame's width,
// which is what makes the vertical offset line up too. Full phones use the BODY's width, since
// phone-2/3 have side buttons sticking out and phone-1 doesn't — so no clipping on those frames.
function PhoneImage({
  src,
  width,
  height,
  box,
  priority,
}: {
  src: string;
  width: number;
  height: number;
  box: PhoneBox;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      sizes="360px"
      priority={priority}
      className="block h-auto max-w-none"
      style={{
        width: `${(width / box.w) * 100}%`,
        marginLeft: `${-(box.x / box.w) * 100}%`,
        marginTop: `${-(box.y / box.w) * 100}%`,
      }}
    />
  );
}
