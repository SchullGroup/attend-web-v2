"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, Building2, Vote, ShieldCheck, FileText, QrCode,
  Radio, Globe, Users, Lock, MessageSquare, BarChart2,
  Trophy, UserPlus, ClipboardList, Award, CalendarDays, FolderOpen,
} from "lucide-react";

const MODULES = [
  {
    num: "01",
    id: "agm",
    name: "Virtual AGMs & Investor Relations",
    headline: "Run compliant, verified shareholder meetings from anywhere",
    subtext:
      "Attend handles the full AGM lifecycle — from notice publication and identity verification to live voting, quorum tracking, and post-meeting audit logs. Built for CAMA 2020 and SEC Nigeria compliance.",
    image:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1400&q=80&fit=crop",
    features: [
      {
        icon: Building2,
        title: "Shareholder Meetings",
        desc: "End-to-end digital meeting management — RSVP, capacity management, live streaming, agenda distribution, and post-meeting documentation. Supports in-person, virtual, and hybrid formats.",
        points: ["RSVP & attendance tracking", "Live resolution management", "Virtual & hybrid support", "SEC/NGX compliance tools"],
      },
      {
        icon: Vote,
        title: "Real-time Voting",
        desc: "Shareholders cast votes on resolutions in real time from any device. Results are tallied instantly with a verifiable audit trail — no waiting, no disputes.",
        points: ["Live vote tallying", "Time-stamped records", "Verifiable audit trail", "Multi-resolution support"],
      },
      {
        icon: ShieldCheck,
        title: "KYC & Identity Verification",
        desc: "Regulatory-grade identity verification using BVN, NIN, and CHN — paired with face liveness detection. Get shareholders verified in under 2 minutes.",
        points: ["BVN, NIN, CHN verification", "Face liveness detection", "Regulatory-grade compliance", "Instant approval flow"],
      },
      {
        icon: FileText,
        title: "Proxy Management",
        desc: "Shareholders appoint a named proxy or the Chairman as proxy — all digitally. Proxy instructions are captured and executed automatically during voting.",
        points: ["Digital proxy forms", "Chairman proxy support", "Named proxy appointment", "Automated proxy execution"],
      },
      {
        icon: QrCode,
        title: "QR Check-in",
        desc: "Every registered attendee receives a unique QR code for instant in-person check-in. Eliminate registration queues and get real-time attendance visibility.",
        points: ["Unique QR per attendee", "Instant scan & verify", "Real-time head count", "Offline-capable scanner"],
      },
      {
        icon: Radio,
        title: "Live Streaming",
        desc: "Broadcast events to virtual and remote attendees with low-latency streaming integrated with the voting system so remote shareholders can participate fully.",
        points: ["Low-latency broadcast", "Remote voting integration", "Recording & playback", "Multi-platform delivery"],
      },
    ],
  },
  {
    num: "02",
    id: "launches",
    name: "Product Launch Events",
    headline: "Launch your product to a registered, engaged audience",
    subtext:
      "Create branded event microsites, manage tiered invitations, release embargoed press kits at the perfect moment, and broadcast your launch live — all from one platform.",
    image:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1400&q=80&fit=crop",
    features: [
      {
        icon: Globe,
        title: "Branded Event Microsite",
        desc: "Customisable event landing page with company branding, product imagery, countdown timer, and agenda — live in minutes.",
        points: ["Custom branding & colours", "Countdown timer", "Speaker & agenda pages", "Mobile-responsive"],
      },
      {
        icon: Users,
        title: "Tiered Invitation Management",
        desc: "Separate invitation lists for press/media, VIP guests, partners, and general public — each with different access levels and registration flows.",
        points: ["Audience segmentation", "Tiered access control", "Personalised invite links", "Capacity limits per tier"],
      },
      {
        icon: Lock,
        title: "Embargoed Press Kit Release",
        desc: "Time-locked documents automatically unlocked at the configured launch moment — no manual distribution, no leaks.",
        points: ["Time-locked asset release", "Secure pre-load vault", "Auto-distribution on go-live", "Download tracking"],
      },
      {
        icon: Radio,
        title: "Live Launch Broadcast",
        desc: "High-quality stream with speaker profiles and product demonstration segments integrated with the event microsite.",
        points: ["Low-latency streaming", "Speaker profiles", "Screen & slide sharing", "Recording & replay"],
      },
      {
        icon: MessageSquare,
        title: "Interactive Engagement",
        desc: "Live polls, audience reactions, and moderated Q&A with the product team — all visible to presenters in real time.",
        points: ["Live audience polls", "Moderated Q&A queue", "Real-time reactions", "Presenter dashboard"],
      },
      {
        icon: BarChart2,
        title: "Post-Launch Analytics",
        desc: "Full attendee export, watch time, poll responses, questions asked, and asset downloads in a clean post-event report.",
        points: ["Attendance & drop-off data", "Poll & Q&A export", "Asset download tracking", "Shareable PDF report"],
      },
    ],
  },
  {
    num: "03",
    id: "innovation",
    name: "Hackathons & Innovation Challenges",
    headline: "Manage the full innovation challenge lifecycle",
    subtext:
      "From challenge discovery and team applications to live pitch sessions, judging, and winner announcements — Attend handles every stage of your innovation programme.",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80&fit=crop",
    features: [
      {
        icon: Trophy,
        title: "Challenge Directory",
        desc: "Browsable listing of open challenges with problem statements, prize breakdowns, eligibility criteria, and sponsor profiles.",
        points: ["Public challenge listing", "Problem statement & prizes", "Eligibility filters", "Sponsor profiles"],
      },
      {
        icon: UserPlus,
        title: "Team Application & Formation",
        desc: "Structured form with team composition, idea description, and document upload — with team invite links and size composition rules.",
        points: ["Individual & team registration", "Team invite links", "Idea & document upload", "Size & composition rules"],
      },
      {
        icon: ClipboardList,
        title: "Application Status Tracking",
        desc: "Real-time status dashboard (Submitted, Under Review, Shortlisted, Selected) with in-platform notifications at every stage.",
        points: ["Live status dashboard", "Stage-gate approvals", "In-platform notifications", "Bulk status updates"],
      },
      {
        icon: Radio,
        title: "Session Streaming",
        desc: "Live and recorded broadcast of mentor sessions, workshops, and keynotes — with breakout room support for team working sessions.",
        points: ["Live pitch streaming", "Workshop broadcasts", "Breakout room support", "Recording & archive"],
      },
      {
        icon: BarChart2,
        title: "Judging Dashboard",
        desc: "Panel-accessible scoring module for evaluating and ranking submissions. Scores aggregate automatically with a real-time leaderboard.",
        points: ["Configurable scoring rubric", "Real-time leaderboard", "Blind judging mode", "Score export & audit"],
      },
      {
        icon: Award,
        title: "Certificates & Leaderboard",
        desc: "Auto-generated participation certificates and winner certificates for placed teams. Public leaderboard celebrates finalists.",
        points: ["Auto-issued certificates", "Winner award documents", "Public leaderboard", "Verifiable credential links"],
      },
    ],
  },
  {
    num: "04",
    id: "general",
    name: "General Client Events",
    headline: "A professional event channel for every occasion",
    subtext:
      "Replace ad-hoc tools with a structured, branded event experience. Host conferences, seminars, roundtables, and awards ceremonies with full RSVP, streaming, and post-event distribution.",
    image:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1400&q=80&fit=crop",
    features: [
      {
        icon: CalendarDays,
        title: "Event Builder & RSVP",
        desc: "Title, description, date/time, format, venue, agenda, speaker profiles, and capacity settings — live in minutes with a shareable link.",
        points: ["Flexible event builder", "Custom registration fields", "Capacity management", "Shareable RSVP link"],
      },
      {
        icon: QrCode,
        title: "Digital QR Check-in",
        desc: "QR code-based check-in for in-person events via the Attend app — no queues, no paper, real-time headcount and capacity alerts.",
        points: ["Unique QR per attendee", "Instant scan & verify", "Real-time headcount", "Offline-capable scanner"],
      },
      {
        icon: Radio,
        title: "Live Streaming",
        desc: "Professional broadcast for virtual and hybrid attendees — low-latency with presenter controls and multi-platform delivery.",
        points: ["Low-latency broadcast", "Hybrid event support", "Presenter controls", "Multi-platform delivery"],
      },
      {
        icon: FileText,
        title: "Post-Event Document Distribution",
        desc: "Post-event reports, proceedings, and presentations pushed to attendees' document vaults automatically after the session ends.",
        points: ["Automated delivery", "Time-locked distribution", "Attendee document vault", "Download tracking"],
      },
      {
        icon: Award,
        title: "Attendance Certificates",
        desc: "Auto-generated digital certificates for CPD-accredited or regulatory sessions — downloadable on demand and fully verifiable.",
        points: ["Auto-issued certificates", "CPD-ready templates", "Verifiable credentials", "On-demand download"],
      },
      {
        icon: FolderOpen,
        title: "Event Archive",
        desc: "All past events, recordings, and documents remain searchable and accessible to organisers and attendees on demand.",
        points: ["Full event history", "Recording storage", "Document archive", "Searchable index"],
      },
    ],
  },
];

export default function FeaturesPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIdx(i);
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollToSection = (i: number) => {
    const el = sectionRefs.current[i];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh" }}>

      {/* ─── Page header ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-32 text-center md:px-8 md:pt-40">
        <span
          className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: "rgba(234,108,0,0.3)", color: "#fb923c", background: "rgba(234,108,0,0.08)" }}
        >
          Platform Features
        </span>
        <h1
          className="mt-4 font-black leading-tight text-white"
          style={{ fontSize: "clamp(32px, 5vw, 60px)" }}
        >
          Everything you need to run
          <br />
          <span style={{ color: "#ea6c00" }}>a modern event.</span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Four purpose-built modules for every event type Nigeria&apos;s institutions run — all under one login.
        </p>
      </div>

      {/* ─── Mobile tab bar ──────────────────────────────────────── */}
      <div
        className="sticky top-16 z-40 flex overflow-x-auto border-b px-4 py-3 lg:hidden"
        style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {MODULES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => scrollToSection(i)}
            className="mr-2 flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all"
            style={{
              background: activeIdx === i ? "#ea6c00" : "rgba(255,255,255,0.06)",
              color: activeIdx === i ? "white" : "rgba(255,255,255,0.45)",
            }}
          >
            {m.num} {m.name.split(" ").slice(0, 2).join(" ")}
          </button>
        ))}
      </div>

      {/* ─── Two-column scrollytelling layout ────────────────────── */}
      <div className="flex">

        {/* Left sticky sidebar — desktop only */}
        <aside className="hidden w-72 flex-shrink-0 lg:block">
          <div
            className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col justify-center"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            {MODULES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => scrollToSection(i)}
                className="group flex items-start gap-4 py-6 pl-10 pr-6 text-left transition-all duration-200"
                style={{
                  borderLeft: `3px solid ${activeIdx === i ? "#ea6c00" : "transparent"}`,
                }}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className="mb-1 block text-[10px] font-black tracking-widest transition-colors"
                    style={{ color: activeIdx === i ? "#ea6c00" : "rgba(255,255,255,0.18)" }}
                  >
                    {m.num}
                  </span>
                  <span
                    className="block text-sm font-semibold leading-snug transition-colors"
                    style={{ color: activeIdx === i ? "white" : "rgba(255,255,255,0.28)" }}
                  >
                    {m.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right scrollable content */}
        <main className="min-w-0 flex-1">
          {MODULES.map((m, i) => {
            return (
              <section
                key={m.id}
                id={m.id}
                ref={(el) => { sectionRefs.current[i] = el; }}
                className="min-h-screen px-6 py-20 lg:px-16 lg:py-24"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Module counter */}
                <p
                  className="mb-5 text-[10px] font-black tracking-widest"
                  style={{ color: "#ea6c00" }}
                >
                  {m.num} / 04
                </p>

                {/* Headline */}
                <h2
                  className="font-black leading-tight text-white"
                  style={{ fontSize: "clamp(24px, 3.5vw, 44px)", maxWidth: 680 }}
                >
                  {m.headline}
                </h2>

                {/* Subtext */}
                <p
                  className="mt-4 text-base leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.48)", maxWidth: 580 }}
                >
                  {m.subtext}
                </p>

                {/* CTA */}
                <div className="mt-7">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
                    style={{ background: "#ea6c00", boxShadow: "0 8px 28px rgba(234,108,0,0.35)" }}
                  >
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Module image */}
                <div
                  className="mt-10 overflow-hidden rounded-2xl"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <img
                    src={m.image}
                    alt={m.name}
                    className="h-[240px] w-full object-cover md:h-[360px]"
                  />
                </div>

                {/* Feature capability cards */}
                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {m.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <div
                        key={f.title}
                        className="rounded-2xl p-5 transition-colors hover:bg-white/6"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div
                          className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ background: "rgba(234,108,0,0.12)" }}
                        >
                          <FIcon className="h-[18px] w-[18px]" style={{ color: "#ea6c00" }} />
                        </div>
                        <h3 className="text-sm font-bold text-white">{f.title}</h3>
                        <p
                          className="mt-1 text-xs leading-relaxed"
                          style={{ color: "rgba(255,255,255,0.42)" }}
                        >
                          {f.desc}
                        </p>
                        <ul className="mt-3 space-y-1">
                          {f.points.map((pt) => (
                            <li
                              key={pt}
                              className="flex items-center gap-1.5 text-[11px]"
                              style={{ color: "rgba(255,255,255,0.28)" }}
                            >
                              <span
                                className="h-1 w-1 shrink-0 rounded-full"
                                style={{ background: "#ea6c00" }}
                              />
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>
      </div>

    </div>
  );
}
