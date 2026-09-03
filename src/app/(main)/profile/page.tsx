"use client";
import { useState } from "react";
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
  User,
  X,
} from "lucide-react";
import { useGetMe, useLogout } from "@/api/auth/hooks";
import { useGetMyEvents, useGetSavedEvents } from "@/api/events/hooks";
import { useGetDocuments } from "@/api/documents/hooks";
import { useGetNotificationPreferences } from "@/api/notifications/hooks";
import { useUserStore } from "@/lib/user-store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, initialsFor } from "@/lib/utils";

// Ported from the figma-redesign branch. Clean adoption — every hook and field
// already exists here (MeResponse has avatarUrl/initials/fullName/phoneNumber;
// the notification-pref flags and document shape match). The live counts reuse
// the same queries each destination page already calls (react-query dedupes on
// the shared key), so this adds no new endpoints — it just surfaces existing
// data one screen earlier.

interface RowItem {
  icon: typeof Lock;
  label: string;
  meta: string;
  href: string;
}

function ProfileAvatar({
  url,
  initials,
  className,
}: {
  url?: string | null;
  initials: string;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
  locked,
}: {
  icon: typeof Lock;
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <div className="flex h-[50px] items-center gap-2.5 rounded-[10px] bg-foreground/[0.04] px-3.5">
        <Icon className="h-4 w-4 shrink-0 text-foreground/40" />
        <span className="truncate text-sm tracking-[-0.14px] text-foreground">{value || "—"}</span>
        {locked && <Lock className="ml-auto h-4 w-4 shrink-0 text-foreground/30" />}
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label, meta, href }: RowItem) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/70">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{label}</p>
          <p className="truncate text-xs text-foreground/60">{meta}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
    </Link>
  );
}

export default function ProfilePage() {
  const { kycStatus } = useUserStore();
  const { data: userResponse, isLoading, error } = useGetMe();
  const currentUser = userResponse?.data;
  const { mutate: logout } = useLogout();
  const verified = kycStatus === "full";
  const [showDetails, setShowDetails] = useState(false);

  // Reuses the same hooks/queries each destination page already calls (react-query
  // dedupes on the shared query key) purely to surface live counts on the menu rows —
  // no new endpoints, just consuming existing data one screen earlier.
  const { data: myEventsResp, isLoading: myEventsLoading } = useGetMyEvents();
  const { data: savedResp, isLoading: savedLoading } = useGetSavedEvents();
  const { data: docsResp, isLoading: docsLoading } = useGetDocuments();
  const { data: prefsResp, isLoading: prefsLoading } = useGetNotificationPreferences();

  const myEventsCount = myEventsResp?.data?.events?.length ?? 0;
  const savedCount = savedResp?.data?.events?.length ?? 0;
  const docsCount = docsResp?.data?.documents?.length ?? 0;
  const prefs = prefsResp?.data;
  const channels: string[] = [];
  if (prefs) {
    if (prefs.inAppRsvpConfirmation || prefs.inAppEventReminder || prefs.inAppNewDocument) channels.push("Push");
    if (prefs.emailRsvpConfirmation || prefs.emailEventReminder || prefs.emailNewDocument) channels.push("Email");
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="animate-pulse text-sm text-foreground/50">Loading profile...</p>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div>
          <h2 className="text-lg font-medium text-foreground">Could not load profile</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Please check your connection or try signing out and in again.
          </p>
        </div>
        <Button onClick={() => logout()}>Sign out</Button>
      </div>
    );
  }

  const rows: RowItem[] = [
    {
      icon: CalendarCheck2,
      label: "My Events",
      meta: myEventsLoading ? "Loading…" : `${myEventsCount} event${myEventsCount === 1 ? "" : "s"}`,
      href: "/profile/my-events",
    },
    {
      icon: Bookmark,
      label: "Saved Events",
      meta: savedLoading ? "Loading…" : `${savedCount} event${savedCount === 1 ? "" : "s"} bookmarked`,
      href: "/profile/saved-events",
    },
    {
      icon: FileText,
      label: "Document Vault",
      meta: docsLoading ? "Loading…" : `${docsCount} document${docsCount === 1 ? "" : "s"}`,
      href: "/profile/documents",
    },
    {
      icon: Bell,
      label: "Notification Preference",
      meta: prefsLoading ? "Loading…" : channels.length ? channels.join(", ") : "All off",
      href: "/profile/notification-preferences",
    },
    {
      icon: Lock,
      label: "Change Password",
      meta: "Change your account password",
      href: "/profile/change-password",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      meta: "FAQs, email and phone support",
      href: "/profile/help",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar
            url={currentUser.avatarUrl}
            initials={currentUser.initials || initialsFor(currentUser.fullName)}
            className="h-14 w-14 shrink-0 text-base"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                {currentUser.fullName}
              </p>
              {verified ? (
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="warning">KYC pending</Badge>
              )}
            </div>
            <p className="truncate text-xs text-foreground/60">{currentUser.role}</p>
          </div>
        </div>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="shrink-0 rounded-lg bg-foreground/[0.04] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.08]"
        >
          Edit Profile
        </button>
      </div>

      {showDetails && (
        <section className="space-y-4 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">My details</h2>
            <button
              onClick={() => setShowDetails(false)}
              aria-label="Close"
              className="text-foreground/40 transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ProfileAvatar
            url={currentUser.avatarUrl}
            initials={currentUser.initials || initialsFor(currentUser.fullName)}
            className="h-20 w-20 text-xl"
          />
          <DetailField icon={User} label="Full Name" value={currentUser.fullName} />
          <DetailField icon={Phone} label="Phone Number" value={currentUser.phoneNumber || "Not provided"} />
          <DetailField icon={Mail} label="Email Address" value={currentUser.email} locked />
          <Button variant="outline" fullWidth onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </section>
      )}

      {!verified && (
        <Link
          href="/intro"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <span>Complete identity verification to unlock voting</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="flex flex-col gap-3 pt-3">
        {rows.map((row) => (
          <MenuRow key={row.href} {...row} />
        ))}

        <button
          onClick={() => logout()}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 text-left shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium tracking-[-0.14px] text-red-600">Sign out</span>
          </span>
          <ChevronRight className="h-4 w-4 text-red-300" />
        </button>
      </div>
    </div>
  );
}
