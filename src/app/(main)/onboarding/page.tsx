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
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Welcome hero */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-gray-900 to-gray-700 p-8 text-white text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
          {initialsFor(fullName)}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold mb-3">
          <Star className="h-3 w-3" /> Welcome to Attend
        </div>
        <h1 className="text-3xl font-bold">Hello, {firstName}!</h1>
        <p className="mt-2 text-sm text-white/70 max-w-sm mx-auto">
          Your account is ready. Here is everything you can do on the Attend platform.
        </p>
      </div>

      {/* Feature tiles */}
      <div className="grid grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, color, bg, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-2xl border border-border bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: bg }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      {/* KYC CTA */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Complete your identity verification</p>
          <p className="text-xs text-amber-700 mt-0.5">
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
