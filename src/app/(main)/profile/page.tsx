"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Bell,
  CalendarCheck2,
  Bookmark,
  HelpCircle,
  LogOut,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useGetMe, useLogout } from "@/api/auth/hooks";
import { useGetMyEvents, useGetSavedEvents } from "@/api/events/hooks";
import { useGetDocuments } from "@/api/documents/hooks";
import { useGetNotificationPreferences } from "@/api/notifications/hooks";
import { useUserStore } from "@/lib/user-store";
import { Button } from "@/components/ui/Button";
import { cn, initialsFor } from "@/lib/utils";
import { MyProfilePanel } from "@/components/attend/profile/MyProfilePanel";
import { MyEventsPanel } from "@/components/attend/profile/MyEventsPanel";
import { SavedEventsPanel } from "@/components/attend/profile/SavedEventsPanel";
import { DocumentVaultPanel } from "@/components/attend/profile/DocumentVaultPanel";
import { NotificationPrefsPanel } from "@/components/attend/profile/NotificationPrefsPanel";
import { ChangePasswordPanel } from "@/components/attend/profile/ChangePasswordPanel";
import { HelpPanel } from "@/components/attend/profile/HelpPanel";

// Figma's Settings frames — one page, two panes. The list stays on the left and the chosen
// section renders beside it, replacing the six separate sub-pages this used to navigate to.
//
// The selection lives in ?section= rather than plain state so the browser back button still
// steps between sections and a section stays linkable (notifications/page.tsx links straight
// to ?section=notifications).
const SECTIONS = [
  { key: "me", label: "My profile" },
  { key: "events", label: "My Events" },
  { key: "saved", label: "Saved Events" },
  { key: "documents", label: "Document Vault" },
  { key: "notifications", label: "Notification Preference" },
  { key: "password", label: "Change Password" },
  { key: "help", label: "Help & Support" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];
const isSection = (v: string | null): v is SectionKey =>
  !!v && SECTIONS.some((s) => s.key === v);

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("section");
  const section: SectionKey | null = isSection(raw) ? raw : null;

  const { kycStatus } = useUserStore();
  const { data: userResponse, isLoading, error } = useGetMe();
  const currentUser = userResponse?.data;
  const { mutate: logout } = useLogout();
  const verified = kycStatus === "full";

  // Same queries the panels themselves call — react-query dedupes on the shared key, so these
  // only surface the live counts on the rows rather than adding requests.
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

  const open = (key: SectionKey) => router.push(`/profile?section=${key}`, { scroll: false });
  const close = () => router.push("/profile", { scroll: false });

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

  const rows = [
    {
      key: "events" as const,
      icon: CalendarCheck2,
      label: "My Events",
      meta: myEventsLoading ? "Loading…" : `${myEventsCount} event${myEventsCount === 1 ? "" : "s"} attended`,
    },
    {
      key: "saved" as const,
      icon: Bookmark,
      label: "Saved Events",
      meta: savedLoading ? "Loading…" : `${savedCount} event${savedCount === 1 ? "" : "s"} bookmarked`,
    },
    {
      key: "documents" as const,
      icon: FileText,
      label: "Document Vault",
      meta: docsLoading ? "Loading…" : `${docsCount} document${docsCount === 1 ? "" : "s"}`,
    },
    {
      key: "notifications" as const,
      icon: Bell,
      label: "Notification Preference",
      meta: prefsLoading ? "Loading…" : channels.length ? channels.join(", ") : "All off",
    },
    {
      key: "password" as const,
      icon: Lock,
      label: "Change Password",
      meta: "Change your account password",
    },
    {
      key: "help" as const,
      icon: HelpCircle,
      label: "Help & Support",
      // Verbatim from the frames, which repeat the Change Password subtitle here. Reads like a
      // copy-paste slip in the design, but the user asked to keep it exactly as drawn.
      meta: "Change your account password",
    },
  ];

  const panel = {
    me: <MyProfilePanel onBack={close} />,
    events: <MyEventsPanel onBack={close} />,
    saved: <SavedEventsPanel onBack={close} />,
    documents: <DocumentVaultPanel onBack={close} />,
    notifications: <NotificationPrefsPanel onBack={close} />,
    password: <ChangePasswordPanel onBack={close} />,
    help: <HelpPanel onBack={close} />,
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
      {/* Left — the settings list. Hidden on mobile once a section is open, since there is only
          room for one pane there and the panel's back arrow returns here. */}
      <div className={cn("flex flex-col gap-3", section && "hidden md:flex")}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-foreground/6 bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
          <div className="flex min-w-0 items-center gap-3">
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {currentUser.initials || initialsFor(currentUser.fullName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.14px] text-foreground">
                {currentUser.fullName}
              </p>
              {/* The frame shows an @handle here; this backend has no username, so the email
                  stands in rather than inventing one. */}
              <p className="truncate text-xs text-foreground/60">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={() => open("me")}
            className="shrink-0 rounded-lg bg-foreground/4 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/8"
          >
            Edit Profile
          </button>
        </div>

        {/* Not in the frames, but still the only prompt to finish KYC from here. */}
        {!verified && (
          <Link
            href="/intro"
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <span>Complete identity verification to unlock voting</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        )}

        {rows.map(({ key, icon: Icon, label, meta }) => (
          <button
            key={key}
            onClick={() => open(key)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]",
              section === key ? "border-foreground/20" : "border-foreground/6"
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/4 text-foreground/70">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                  {label}
                </span>
                <span className="block truncate text-xs text-foreground/60">{meta}</span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
          </button>
        ))}

        {/* Kept deliberately: the sidebar account menu that carries sign-out is desktop-only,
            so on mobile this row is the only way out of the session. */}
        <button
          onClick={() => logout()}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/6 bg-white p-4 text-left shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
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

      {/* Right — the open section. Empty on desktop until one is chosen; absent on mobile. */}
      <div className={cn(!section && "hidden md:block")}>
        {section ? (
          panel[section]
        ) : (
          <div className="hidden h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-foreground/10 p-10 text-center text-sm text-foreground/40 md:flex">
            Choose a setting to view it here.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  // useSearchParams needs a Suspense boundary to keep this route statically renderable.
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}
