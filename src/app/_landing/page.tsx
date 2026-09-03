"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Building2, Rocket, Lightbulb,
  ShieldCheck, QrCode, Vote, Radio, CheckCircle2, Users, Star,
  Smartphone, LayoutDashboard, CalendarCheck, Trophy, CalendarDays,
} from "lucide-react";
import { Reveal } from "./_components/Reveal";

const TESTIMONIALS = [
  {
    quote: "Attend transformed our AGM from a logistical nightmare into a seamless experience. Shareholder turnout doubled and voting results were instant.",
    name: "Adaeze Nwosu", role: "Company Secretary", company: "Zenith Bank Plc",
    accent: true,
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&q=80&fit=crop&crop=face",
  },
  {
    quote: "The KYC flow is the most elegant we've seen. Our shareholders verified in minutes, not days. The proxy feature alone saved weeks of admin.",
    name: "Tunde Bakare", role: "Head of Investor Relations", company: "GTCo Holdings",
    accent: false,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&fit=crop&crop=face",
  },
  {
    quote: "We ran MeriHack entirely on Attend — from applications through to certificate issuance. Hundreds of participants, zero issues.",
    name: "Dr. Yewande Adeyemi", role: "Chief Innovation Officer", company: "Meristem Innovation Hub",
    accent: false,
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&q=80&fit=crop&crop=face",
  },
];

const PERSONAS = [
  {
    role: "Retail Shareholder",
    story: "Ngozi holds shares in a Lagos-listed company but has never attended an AGM. With Attend, she votes live from her phone in Enugu — no travel, no paperwork.",
    icon: Smartphone,
    badge: "Votes from any device",
    featured: true,
  },
  {
    role: "Company Secretary",
    story: "Emeka's AGM season used to consume weeks. Now he monitors live attendance, quorum, and vote tallies from one dashboard — and closes in hours.",
    icon: LayoutDashboard,
    iconColor: "rgba(255,255,255,0.55)",
    iconBg: "rgba(255,255,255,0.07)",
    cardBg: "#0f172a",
    dark: true,
  },
  {
    role: "Product Marketer",
    story: "Chidera needed a controlled launch experience for her fintech's new product. Attend gave her a branded microsite, tiered invitations, and a live press kit release.",
    icon: Rocket,
    iconColor: "#ea6c00",
    iconBg: "rgba(234,108,0,0.1)",
    cardBg: "#ffffff",
    dark: false,
  },
  {
    role: "Student Innovator",
    story: "Tolu discovered MeriHack on social media. She applied, tracked her status, submitted her prototype, and attended the live finals — all inside Attend.",
    icon: Lightbulb,
    iconColor: "#a855f7",
    iconBg: "rgba(168,85,247,0.1)",
    cardBg: "#0f172a",
    dark: true,
  },
  {
    role: "Event Delegate",
    story: "Biodun attends regulatory roundtables across Nigeria. One platform for RSVPs, livestreams, and post-event documents — no more email chains.",
    icon: CalendarCheck,
    iconColor: "#0891b2",
    iconBg: "rgba(8,145,178,0.1)",
    cardBg: "#ffffff",
    dark: false,
  },
];

const MODULES = [
  {
    num: "01",
    icon: Building2,
    name: "Virtual AGMs & Investor Relations",
    tagline: "Compliant. Verified. Auditable.",
    desc: "Run identity-verified shareholder meetings with real-time electronic voting, quorum tracking, and full audit logs — compliant with CAMA 2020 and SEC Nigeria rules.",
    capabilities: [
      "BVN/CHN identity verification",
      "Electronic voting with instant ballot tallying",
      "Auto-generated minutes & statutory return export",
    ],
    dark: true,
  },
  {
    num: "02",
    icon: Rocket,
    name: "Product Launch Events",
    tagline: "Controlled. Branded. Memorable.",
    desc: "Launch products to a registered audience with countdown microsites, tiered invitations, embargoed press kit releases, and live interactive broadcasts.",
    capabilities: [
      "Branded event microsite with countdown",
      "Time-locked press kit distribution",
      "Live polls and moderated Q&A",
    ],
    dark: false,
  },
  {
    num: "03",
    icon: Trophy,
    name: "Hackathons & Innovation Challenges",
    tagline: "Discover. Apply. Compete.",
    desc: "Manage the full innovation challenge lifecycle — from application and team formation to live pitch sessions, judging, and winner announcements.",
    capabilities: [
      "Structured application & team management",
      "Judging dashboard with scoring rubric",
      "Certificates of participation for all entrants",
    ],
    dark: false,
  },
  {
    num: "04",
    icon: CalendarDays,
    name: "General Client Events",
    tagline: "Professional. Seamless. Archived.",
    desc: "Host conferences, seminars, roundtables, and awards ceremonies with RSVP management, live streaming, post-event document distribution, and attendance certificates.",
    capabilities: [
      "Digital RSVP and QR check-in",
      "Live streaming for hybrid & virtual attendees",
      "Post-event communiques pushed to document vault",
    ],
    dark: true,
  },
];

export default function LandingHome() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1800&q=80&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(8,12,24,0.96) 0%, rgba(17,24,39,0.88) 55%, rgba(17,24,39,0.65) 100%)" }}
        />

        {/* Background watermark */}
        <div
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-end overflow-hidden"
          aria-hidden
        >
          <span
            style={{
              fontSize: "clamp(110px, 20vw, 320px)",
              fontWeight: 900,
              color: "rgba(255,255,255,0.03)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              transform: "translateX(6%)",
            }}
          >
            ATTEND
          </span>
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 pb-16 pt-28 md:px-8">
          <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">

            {/* Left — headline & CTAs */}
            <div className="flex flex-col gap-6">
              <div
                className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: "rgba(234,108,0,0.5)", color: "#fb923c", background: "rgba(234,108,0,0.1)" }}
              >
                <Radio className="h-3 w-3" />
                Nigeria&apos;s enterprise events platform
              </div>

              <h1
                className="font-black leading-[0.95] tracking-tight text-white"
                style={{ fontSize: "clamp(44px, 6.5vw, 84px)" }}
              >
                The smarter{" "}
                <span style={{ color: "#ea6c00" }}>✦</span>
                <br />
                way to{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #ea6c00, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  attend.
                </span>
              </h1>

              <p
                className="max-w-md text-base leading-relaxed"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                AGMs, product launches, innovation challenges, and every corporate event — end-to-end on a single platform built for Nigeria&apos;s capital markets.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: "#ea6c00", boxShadow: "0 8px 28px rgba(234,108,0,0.38)" }}
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/landing/features"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white/10"
                >
                  See the platform
                </Link>
              </div>
            </div>

            {/* Right — floating UI cards */}
            <div className="relative hidden lg:block" style={{ height: 500 }}>
              {/* Card A: Live voting */}
              <div
                className="absolute rounded-2xl border border-white/10 shadow-2xl"
                style={{
                  width: 272, top: 16, left: 30,
                  background: "#0f172a", padding: "16px",
                  animation: "floatA 5s ease-in-out infinite",
                  animationDelay: "0.4s", zIndex: 1,
                  boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live Now
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Resolution 3/4</span>
                </div>
                <p className="text-sm font-bold text-white leading-snug">
                  Zenith Bank Plc
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>Re-election of Directors</span>
                </p>
                <div className="mt-3 space-y-2 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {[
                    { label: "For", pct: 84, active: true },
                    { label: "Against", pct: 12, active: false },
                    { label: "Abstain", pct: 4, active: false },
                  ].map((v) => (
                    <div key={v.label}>
                      <div className="mb-1 flex justify-between" style={{ fontSize: 10 }}>
                        <span style={{ color: v.active ? "white" : "rgba(255,255,255,0.45)" }}>{v.label}</span>
                        <span style={{ color: "white", fontWeight: 700 }}>{v.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${v.pct}%`, background: v.active ? "#ea6c00" : "rgba(255,255,255,0.25)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card B: KYC verified */}
              <div
                className="absolute rounded-2xl bg-white shadow-2xl"
                style={{
                  width: 232, top: 200, right: 10,
                  padding: "16px",
                  animation: "floatB 6s ease-in-out infinite",
                  animationDelay: "1s", zIndex: 2,
                  boxShadow: "0 32px 64px rgba(0,0,0,0.25)",
                }}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "#dcfce7" }}>
                    <ShieldCheck className="h-4 w-4" style={{ color: "#16a34a" }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">KYC Verified</p>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>Identity confirmed</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {["BVN", "NIN", "Face Match"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "#f9fafb" }}>
                      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{item}</span>
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#16a34a" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card C: Event RSVP */}
              <div
                className="absolute rounded-2xl bg-white shadow-2xl"
                style={{
                  width: 252, bottom: 20, left: 60,
                  padding: "0 0 16px",
                  animation: "floatC 4.5s ease-in-out infinite",
                  animationDelay: "0s", zIndex: 3,
                  overflow: "hidden",
                  boxShadow: "0 32px 64px rgba(0,0,0,0.25)",
                }}
              >
                <div className="relative h-20 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80&fit=crop"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }} />
                  <span
                    className="absolute bottom-2 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "#ea6c00" }}
                  >
                    Launch Event
                  </span>
                </div>
                <div className="px-4 pt-3">
                  <p className="text-sm font-bold text-gray-900 leading-snug">MeriSave Product Launch</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>15 Jun 2026 · 2:00 PM · Virtual</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1" style={{ fontSize: 11, color: "#9ca3af" }}>
                      <Users className="h-3 w-3" /> Registered
                    </div>
                    <button className="rounded-full px-4 py-1.5 text-[11px] font-bold text-white" style={{ background: "#ea6c00" }}>
                      RSVP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>Scroll</span>
          <div className="h-8 w-px" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)" }} />
        </div>
      </section>

      {/*
       * ─── Partner logos strip ─────────────────────────────────────
       * Commented out — to be restored when partner logos are verified
       *
       * <section className="border-y border-gray-100 bg-white py-8">
       *   <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
       *     Trusted by Nigeria's leading institutions
       *   </p>
       *   <div className="overflow-hidden">
       *     <div className="marquee-inner flex gap-14 whitespace-nowrap" style={{ width: "max-content" }}>
       *       {[...PARTNERS, ...PARTNERS].map((p, i) => (
       *         <span key={i} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400">
       *           <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i % 6] }} />
       *           {p}
       *         </span>
       *       ))}
       *     </div>
       *   </div>
       * </section>
       */}

      {/* ─── Value section ───────────────────────────────────────── */}
      <section className="py-24 md:py-36" style={{ background: "#0f172a" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: "rgba(234,108,0,0.3)", color: "#fb923c", background: "rgba(234,108,0,0.08)" }}
            >
              Why Attend
            </span>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal delay={80}>
              <p
                className="font-black leading-none tracking-tight text-white"
                style={{ fontSize: "clamp(64px, 10vw, 140px)" }}
              >
                One<br />
                <span style={{ color: "#ea6c00" }}>platform.</span>
              </p>
            </Reveal>

            <Reveal delay={160}>
              <div className="space-y-5">
                <p
                  className="font-bold leading-snug text-white"
                  style={{ fontSize: "clamp(18px, 2.2vw, 24px)" }}
                >
                  Nigeria&apos;s capital markets deserve infrastructure as sophisticated as their ambitions.
                </p>
                <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Attend replaces paper proxies, spreadsheets, and fragmented tools with a seamless, KYC-verified digital experience — one platform for every corporate event, built for the institutions that move markets.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-85"
                  style={{ background: "#ea6c00" }}
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Features overview ───────────────────────────────────── */}
      <section className="py-24 md:py-32" id="features" style={{ background: "#f8fafc" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="mb-3 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500">
                  Features
                </span>
                <h2
                  className="mt-2 font-black leading-tight text-gray-900"
                  style={{ fontSize: "clamp(30px, 4.5vw, 54px)" }}
                >
                  Everything you need<br />to run a modern event
                </h2>
              </div>
              <Link
                href="/landing/features"
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-70"
                style={{ color: "#ea6c00" }}
              >
                View all features <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          {/* Bento grid */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* Shareholder Meetings — wide */}
            <Reveal delay={80} className="md:col-span-2">
              <div
                className="group relative h-full min-h-60 overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: "linear-gradient(135deg, #111827 0%, #1e3a5f 100%)" }}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                <Building2 className="mb-4 h-8 w-8" style={{ color: "rgba(255,255,255,0.6)" }} />
                <h3 className="text-xl font-bold text-white">Shareholder Meetings</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Full digital meeting infrastructure — RSVP management, live streaming, resolutions voting, proxy forms, and post-meeting receipt generation. Regulatory compliant.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Live voting", "Proxy forms", "Compliance", "Digital receipts"].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Real-time Voting — tall accent */}
            <Reveal delay={120} className="md:row-span-3 h-full">
              <div
                className="group relative flex h-full flex-col min-h-80 overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: "linear-gradient(160deg, #ea6c00 0%, #c2410c 100%)" }}
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <Vote className="mb-4 h-8 w-8 text-white" />
                <h3 className="text-xl font-bold text-white">Real-time Voting</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
                  Cast and tally votes on resolutions instantly. Every vote is time-stamped, shareholder-attributed, and verifiable.
                </p>
                <div className="mt-8 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.14)" }}>
                  <p className="mb-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                    Resolution 3 · Live
                  </p>
                  {[
                    { label: "For", pct: 84 },
                    { label: "Against", pct: 12 },
                    { label: "Abstain", pct: 4 },
                  ].map((v) => (
                    <div key={v.label} className="mb-2.5">
                      <div className="mb-1 flex justify-between" style={{ fontSize: 11 }}>
                        <span className="text-white/75">{v.label}</span>
                        <span className="font-bold text-white">{v.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <div className="h-full rounded-full" style={{ width: `${v.pct}%`, background: "rgba(255,255,255,0.85)" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vote Receipt widget */}
                <div className="mt-auto pt-5">
                  <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(34,197,94,0.2)" }}
                      >
                        <CheckCircle2 className="h-4 w-4" style={{ color: "#4ade80" }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Your vote has been recorded</p>
                        <p className="mt-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Ref: #AGM-2026-00142
                        </p>
                        <p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Today · 10:47 AM WAT
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* KYC */}
            <Reveal delay={160} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-gray-200 transition-colors group-hover:text-gray-400" />
                <ShieldCheck className="mb-3 h-7 w-7" style={{ color: "#16a34a" }} />
                <h3 className="text-base font-bold text-gray-900">KYC & Identity Verification</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  BVN, NIN, CHN with face liveness detection — regulatory-grade identity in under 2 minutes.
                </p>
              </div>
            </Reveal>

            {/* Innovation */}
            <Reveal delay={200} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-gray-200 transition-colors group-hover:text-gray-400" />
                <Lightbulb className="mb-3 h-7 w-7" style={{ color: "#7c22c9" }} />
                <h3 className="text-base font-bold text-gray-900">Innovation Challenges</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Full challenge lifecycle — applications, team management, submissions, judging, and digital certificates.
                </p>
              </div>
            </Reveal>

            {/* QR + Launches — wide */}
            <Reveal delay={240} className="md:col-span-2">
              <div className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-gray-200 transition-colors group-hover:text-gray-400" />
                <div className="flex items-start gap-6">
                  <QrCode className="mt-0.5 h-7 w-7 shrink-0" style={{ color: "#0891b2" }} />
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900">QR Check-in & Launch Events</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                      Instant in-person attendance with unique QR codes — no queues, no paper. Paired with RSVP, press kit distribution, and live streaming.
                    </p>
                  </div>
                  <Rocket className="mt-0.5 h-7 w-7 shrink-0" style={{ color: "#ea6c00" }} />
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ─── Who It's For ────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: "#111827" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: "rgba(234,108,0,0.3)", color: "#fb923c", background: "rgba(234,108,0,0.08)" }}
            >
              Who it&apos;s for
            </span>
            <h2
              className="mt-4 font-black leading-tight text-white"
              style={{ fontSize: "clamp(30px, 4.5vw, 54px)" }}
            >
              Built for every seat<br />at the table
            </h2>
          </Reveal>

          {/* Asymmetric grid: featured left, 2×2 right */}
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr_1fr]">

            {/* Featured — Ngozi / Retail Shareholder (orange, spans 2 rows) */}
            <Reveal delay={80} className="lg:row-span-2">
              <div
                className="group relative flex h-full min-h-70 flex-col overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: "linear-gradient(160deg, #ea6c00 0%, #c2410c 100%)" }}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />

                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <Smartphone className="h-6 w-6 text-white" />
                </div>

                <p className="mb-3 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Retail Shareholder
                </p>
                <p
                  className="flex-1 leading-relaxed text-white"
                  style={{ fontSize: "clamp(15px, 1.4vw, 17px)" }}
                >
                  Ngozi holds shares in a Lagos-listed company but has never attended an AGM. With Attend, she votes live from her phone in Enugu — no travel, no paperwork.
                </p>

                <div
                  className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Votes from any device
                </div>
              </div>
            </Reveal>

            {/* Emeka — Company Secretary (dark) */}
            <Reveal delay={120}>
              <div
                className="group relative flex h-full min-h-50 flex-col overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ background: "#0f172a" }}
              >
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <LayoutDashboard className="h-5 w-5" style={{ color: "rgba(255,255,255,0.55)" }} />
                </div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Company Secretary
                </p>
                <p className="text-sm leading-relaxed text-white/75">
                  Emeka&apos;s AGM season used to consume weeks. Now he monitors live attendance, quorum, and vote tallies from one dashboard — and closes in hours.
                </p>
              </div>
            </Reveal>

            {/* Chidera — Product Marketer (white) */}
            <Reveal delay={160}>
              <div
                className="group relative flex h-full min-h-50 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(234,108,0,0.1)" }}
                >
                  <Rocket className="h-5 w-5" style={{ color: "#ea6c00" }} />
                </div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Product Marketer
                </p>
                <p className="text-sm leading-relaxed text-gray-600">
                  Chidera needed a controlled launch experience for her fintech&apos;s new product. Attend gave her a branded microsite, tiered invitations, and a live press kit release.
                </p>
              </div>
            </Reveal>

            {/* Tolu — Student Innovator (dark) */}
            <Reveal delay={200}>
              <div
                className="group relative flex h-full min-h-50 flex-col overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ background: "#0f172a" }}
              >
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(168,85,247,0.12)" }}
                >
                  <Lightbulb className="h-5 w-5" style={{ color: "#a855f7" }} />
                </div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Student Innovator
                </p>
                <p className="text-sm leading-relaxed text-white/75">
                  Tolu discovered MeriHack on social media. She applied, tracked her status, submitted her prototype, and attended the live finals — all inside Attend.
                </p>
              </div>
            </Reveal>

            {/* Biodun — Event Delegate (white) */}
            <Reveal delay={240}>
              <div
                className="group relative flex h-full min-h-50 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(8,145,178,0.1)" }}
                >
                  <CalendarCheck className="h-5 w-5" style={{ color: "#0891b2" }} />
                </div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Event Delegate
                </p>
                <p className="text-sm leading-relaxed text-gray-600">
                  Biodun attends regulatory roundtables across Nigeria. One platform for RSVPs, livestreams, and post-event documents — no more email chains.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ─── Four Events. One Platform. ─────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: "#f8fafc" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center">
              <span className="mb-4 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500">
                Event Modules
              </span>
              <h2
                className="mt-3 font-black leading-tight text-gray-900"
                style={{ fontSize: "clamp(32px, 5vw, 60px)" }}
              >
                Four events.{" "}
                <span style={{ color: "#ea6c00" }}>✦</span>{" "}
                One platform.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-500">
                Purpose-built modules for every event type Nigeria&apos;s institutions run — all under one login.
              </p>
            </div>
          </Reveal>

          {/* 2×2 module grid */}
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <Reveal key={mod.num} delay={i * 80}>
                  <div
                    className="group relative min-h-85 overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={{
                      background: mod.dark ? "#111827" : "#ffffff",
                      border: mod.dark ? "none" : "1px solid #e5e7eb",
                    }}
                  >
                    {/* Watermark number */}
                    <div
                      className="pointer-events-none absolute -bottom-6 -right-4 select-none font-black leading-none"
                      aria-hidden
                      style={{
                        fontSize: 160,
                        color: mod.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                        letterSpacing: "-0.05em",
                      }}
                    >
                      {mod.num}
                    </div>

                    {/* Header row */}
                    <div className="mb-6 flex items-start justify-between">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl"
                        style={{
                          background: mod.dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                        }}
                      >
                        <Icon
                          className="h-6 w-6"
                          style={{ color: mod.dark ? "rgba(255,255,255,0.7)" : "#374151" }}
                        />
                      </div>
                      <span
                        className="font-black tracking-wider"
                        style={{
                          fontSize: 13,
                          color: mod.dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                        }}
                      >
                        {mod.num}
                      </span>
                    </div>

                    {/* Tagline */}
                    <p
                      className="mb-1 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "#ea6c00" }}
                    >
                      {mod.tagline}
                    </p>

                    {/* Module name */}
                    <h3
                      className="text-xl font-black leading-snug"
                      style={{ color: mod.dark ? "white" : "#111827" }}
                    >
                      {mod.name}
                    </h3>

                    {/* Description */}
                    <p
                      className="mt-3 text-sm leading-relaxed"
                      style={{ color: mod.dark ? "rgba(255,255,255,0.5)" : "#6b7280" }}
                    >
                      {mod.desc}
                    </p>

                    {/* Slide-up capabilities reveal on hover */}
                    <div
                      className="absolute inset-x-0 bottom-0 translate-y-full p-6 transition-transform duration-300 ease-out group-hover:translate-y-0"
                      style={{
                        background: "rgba(15,23,42,0.94)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <p
                        className="mb-3 text-[10px] font-black uppercase tracking-widest"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Key capabilities
                      </p>
                      <div className="space-y-2.5">
                        {mod.capabilities.map((cap) => (
                          <div key={cap} className="flex items-start gap-2.5">
                            <div
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: "#ea6c00" }}
                            />
                            <span className="text-sm leading-relaxed text-white/80">{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Editorial bottom line */}
          <Reveal delay={160}>
            <div className="mt-16 text-center">
              <div className="inline-block border-t border-gray-200 pt-10 w-full">
                <p
                  className="font-black tracking-tight text-gray-900"
                  style={{ fontSize: "clamp(22px, 3.2vw, 42px)" }}
                >
                  Every module.{" "}
                  <span style={{ color: "#ea6c00" }}>One login.</span>{" "}
                  One platform.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white" id="testimonials">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="mb-3 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500">
                  Testimonials
                </span>
                <h2
                  className="mt-2 font-black leading-tight text-gray-900"
                  style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
                >
                  Loved by Nigeria&apos;s<br />leading institutions
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-sm font-semibold text-gray-500">4.9 / 5</span>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <div
                  className="flex h-full flex-col rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    background: t.accent ? "linear-gradient(135deg, #ea6c00, #c2410c)" : "white",
                    border: t.accent ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  <div className="mb-4 flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className="h-3.5 w-3.5"
                        style={{
                          fill: t.accent ? "rgba(255,255,255,0.7)" : "#fbbf24",
                          color: t.accent ? "rgba(255,255,255,0.7)" : "#fbbf24",
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="flex-1 text-sm leading-relaxed"
                    style={{ color: t.accent ? "rgba(255,255,255,0.88)" : "#374151" }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div
                    className="mt-6 flex items-center gap-3 border-t pt-5"
                    style={{ borderColor: t.accent ? "rgba(255,255,255,0.15)" : "#f3f4f6" }}
                  >
                    <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold" style={{ color: t.accent ? "white" : "#111827" }}>
                        {t.name}
                      </p>
                      <p className="text-xs" style={{ color: t.accent ? "rgba(255,255,255,0.6)" : "#6b7280" }}>
                        {t.role} · {t.company}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 md:py-44" style={{ background: "#0f172a" }}>
        <div
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
          aria-hidden
        >
          <span
            style={{
              fontSize: "clamp(90px, 18vw, 260px)",
              fontWeight: 900,
              color: "rgba(255,255,255,0.025)",
              letterSpacing: "-0.04em",
            }}
          >
            ATTEND
          </span>
        </div>

        <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
          <Reveal>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "#fb923c" }}>
              Get started today
            </p>
            <h2
              className="font-black leading-tight text-white"
              style={{ fontSize: "clamp(34px, 6vw, 72px)" }}
            >
              Ready to modernise
              <br />
              <span style={{ color: "#ea6c00" }}>your events?</span>
            </h2>
            <p
              className="mx-auto mt-6 max-w-lg text-base leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Join Nigeria&apos;s leading institutions on the platform built for the future of corporate events.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white transition-all hover:scale-105"
                style={{ background: "#ea6c00", boxShadow: "0 12px 40px rgba(234,108,0,0.4)" }}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Already have an account? Sign in →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>


    </div>
  );
}
