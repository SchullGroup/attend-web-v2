"use client";
import Link from "next/link";
import { Building2, Lightbulb, Rocket, ShieldCheck, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetMe } from "@/api/auth/hooks";
import { initialsFor } from "@/lib/utils";

const FEATURES = [
  {
    icon: Building2,
    color: "#111827",
    bg: "#f3f4f6",
    title: "AGM Voting",
    desc: "Participate in Annual General Meetings, vote on resolutions, and appoint proxies as a verified shareholder.",
    href: "/agm",
  },
  {
    icon: Lightbulb,
    color: "#7c3aed",
    bg: "#f5f3ff",
    title: "Innovation Challenges",
    desc: "Enter hackathons, submit your project, and compete for prizes with Meristem's innovation programme.",
    href: "/hackathon",
  },
  {
    icon: Rocket,
    color: "#059669",
    bg: "#ecfdf5",
    title: "Events & Launches",
    desc: "RSVP to product launches, investor days, and corporate events — virtual or in-person.",
    href: "/events",
  },
  {
    icon: ShieldCheck,
    color: "#d97706",
    bg: "#fffbeb",
    title: "Identity Verification",
    desc: "Complete KYC with your BVN and CHN to unlock shareholder voting and full platform access.",
    href: "/intro",
  },
];

export default function OnboardingPage() {
  const { data: meResp } = useGetMe();
  const fullName = meResp?.data?.fullName || "there";
  const firstName = fullName.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      {/* Welcome hero — dark gradient kept as the intentional welcome moment */}
      <div className="rounded-2xl bg-linear-to-br from-gray-900 to-gray-700 p-8 text-center text-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
          {initialsFor(fullName)}
        </div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          <Star className="h-3 w-3" /> Welcome to Attend
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.6px]">Hello, {firstName}!</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">
          Your account is ready. Here is everything you can do on the Attend platform.
        </p>
      </div>

      {/* Feature tiles */}
      <div className="grid grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, color, bg, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
          >
            <div
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: bg }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs leading-relaxed text-foreground/60">{desc}</p>
          </Link>
        ))}
      </div>

      {/* KYC CTA */}
      <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-amber-100">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">Complete your identity verification</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Verify your BVN and CHN to unlock AGM voting and full shareholder access. Takes about 2 minutes.
          </p>
        </div>
        <Link href="/intro" className="shrink-0">
          <Button size="sm" className="gap-1">
            Verify now <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Skip CTA */}
      <div className="text-center">
        <Link href="/">
          <Button variant="ghost" size="md">
            Explore the dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
