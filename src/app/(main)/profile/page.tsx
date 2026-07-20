"use client";
import Link from "next/link";
import {
  Lock,
  Bell,
  CalendarCheck2,
  Bookmark,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { useGetMe, useLogout } from "@/api/auth/hooks";
import { useUserStore } from "@/lib/user-store";
import { Badge } from "@/components/ui/Badge";
import { initialsFor } from "@/lib/utils";

interface RowItem {
  icon: typeof Lock;
  label: string;
  href: string;
}

const SECTIONS: { title: string; items: RowItem[] }[] = [
  {
    title: "Account",
    items: [
      { icon: Lock, label: "Change password", href: "/profile/change-password" },
      { icon: FileText, label: "My documents", href: "/profile/documents" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Bell, label: "Notification preferences", href: "/profile/notification-preferences" },
    ],
  },
  {
    title: "Activity",
    items: [
      { icon: CalendarCheck2, label: "My events", href: "/profile/my-events" },
      { icon: Bookmark, label: "Saved events", href: "/profile/saved-events" },
    ],
  },
  {
    title: "Support",
    items: [{ icon: HelpCircle, label: "Help & FAQ", href: "/profile/help" }],
  },
];

export default function ProfilePage() {
  const { kycStatus } = useUserStore();
  const { data: userResponse, isLoading, error } = useGetMe();
  const currentUser = userResponse?.data;
  const { mutate: logout } = useLogout();
  const verified = kycStatus === "full";

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Could not load profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please check your connection or try signing out and in again.
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/95"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, preferences and activity.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white">
              {currentUser.initials || initialsFor(currentUser.fullName)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{currentUser.fullName}</h2>
                {verified ? (
                  <Badge variant="success">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">KYC pending</Badge>
                )}
              </div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {currentUser.role}
              </p>
              <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {currentUser.email}
                </p>
                {currentUser.phoneNumber && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {currentUser.phoneNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {!verified && (
          <Link
            href="/intro"
            className="flex items-center justify-between border-t border-border bg-amber-50 px-6 py-3 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            <span>Complete identity verification to unlock voting</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {s.title}
          </h3>
          <ul className="overflow-hidden rounded-2xl border border-border bg-white">
            {s.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.href} className={i > 0 ? "border-t border-border" : ""}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Danger
        </h3>
        <button
          onClick={() => logout()}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <span className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            Sign out
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
