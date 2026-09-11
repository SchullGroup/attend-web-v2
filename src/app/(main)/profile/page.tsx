"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Bell,
  Files,
  FolderOpen,
  Vault,
  MessageSquareMore,
  LogOut,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { useGetMe, useLogout } from "@/api/auth/hooks";
import { useGetMyEvents, useGetSavedEvents } from "@/api/events/hooks";
import { useGetDocuments } from "@/api/documents/hooks";
import { useGetNotificationPreferences } from "@/api/notifications/hooks";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { MyProfilePanel } from "@/components/attend/profile/MyProfilePanel";
import { MyEventsPanel } from "@/components/attend/profile/MyEventsPanel";
import { SavedEventsPanel } from "@/components/attend/profile/SavedEventsPanel";
import { DocumentVaultPanel } from "@/components/attend/profile/DocumentVaultPanel";
import { NotificationPrefsPanel } from "@/components/attend/profile/NotificationPrefsPanel";
import { ChangePasswordPanel } from "@/components/attend/profile/ChangePasswordPanel";
import { HelpPanel } from "@/components/attend/profile/HelpPanel";
import { filterEventsByTab } from "@/components/attend/profile/eventTabs";

// Figma's Settings frames — one page, two panes. The list stays on the left and the chosen
// section renders in a panel pinned to the right edge of the window.
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

// Width of the pinned right-hand panel on large screens. Set once as a CSS variable so the panel
// and the list beside it read the same number — the list's width is derived from it, which is
// what guarantees the two can never overlap.
const PANEL_WIDTH = "clamp(400px, 34vw, 600px)";

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("section");
  const section: SectionKey | null = isSection(raw) ? raw : null;

  const { data: userResponse, isLoading, error } = useGetMe();
  const currentUser = userResponse?.data;
  const { mutate: logout } = useLogout();
  // Hooks stay above the early returns below. A dead avatar URL falls back to the person icon
  // rather than rendering a torn image.
  const [avatarFailed, setAvatarFailed] = useState(false);
  // This page deliberately reads no KYC state at all. It used to derive `verified` from
  // `useUserStore().kycStatus`, which seeds synchronously from localStorage["attend:demo:kyc"] —
  // a key `useLogout` used to leave behind, so user A could verify, log out, user B log in on the
  // same browser, and this page would tell B they were verified. The nudge that depended on it
  // is gone (see below); don't reintroduce the store read if it ever comes back.

  // Same queries the panels themselves call — react-query dedupes on the shared key, so these
  // only surface the live counts on the rows rather than adding requests.
  const { data: myEventsResp, isLoading: myEventsLoading } = useGetMyEvents();
  const { data: savedResp, isLoading: savedLoading } = useGetSavedEvents();
  const { data: docsResp, isLoading: docsLoading } = useGetDocuments();
  const { data: prefsResp, isLoading: prefsLoading } = useGetNotificationPreferences();

  // "Attended" uses the exact rule the panel's Attended tab uses (`filterEventsByTab`): finished
  // events you RSVP'd to. It used to be the length of the WHOLE list, so an account with six
  // upcoming RSVPs and nothing attended read "6 events attended" — and disagreed with the tab
  // one click away.
  const attendedCount = filterEventsByTab(myEventsResp?.data?.events ?? [], "Attended").length;
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

  // Icons per the Figma frames: stacked documents, an open folder, a vault, a bell, a lock and a
  // chat bubble. They sit bare beside the label — the grey squares they used to sit in aren't in
  // the design.
  const rows = [
    {
      key: "events" as const,
      icon: Files,
      label: "My Events",
      meta: myEventsLoading ? "Loading…" : `${attendedCount} event${attendedCount === 1 ? "" : "s"} attended`,
    },
    {
      key: "saved" as const,
      icon: FolderOpen,
      label: "Saved Events",
      meta: savedLoading ? "Loading…" : `${savedCount} event${savedCount === 1 ? "" : "s"} bookmarked`,
    },
    {
      key: "documents" as const,
      icon: Vault,
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
      icon: MessageSquareMore,
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

  const avatarUrl = !avatarFailed ? currentUser.avatarUrl || null : null;

  return (
    <div style={{ "--settings-panel-w": PANEL_WIDTH } as React.CSSProperties}>
      {/* Left — the settings list. Below `lg` there's only room for one pane, so the list hides
          once a section is open and the panel's back arrow returns here. On `lg` and up its
          width is derived from the panel's, so it always stops short of the pinned panel. */}
      <div
        className={cn(
          "flex flex-col gap-3 lg:w-[calc(100vw_-_360px_-_var(--settings-panel-w))] lg:max-w-[520px]",
          section && "hidden lg:flex",
        )}
      >
        {/* Name block sits on the page, not in a card — per the frame. */}
        <div className="mb-1 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              // Person icon, not initials — matches the sidebar's user card.
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" strokeWidth={1.75} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.14px] text-foreground">
                {currentUser.fullName}
              </p>
              {/* The frame shows an @handle here. The backend does have a username (§25), but
                  it is deliberately not surfaced anywhere in this app — see MyProfilePanel —
                  so the email stands in. */}
              <p className="truncate text-xs text-foreground/60">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={() => open("me")}
            className="shrink-0 rounded-md bg-foreground/6 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/10"
          >
            Edit Profile
          </button>
        </div>

        {/* KYC nudge — REMOVED 2026-09-10 on request, same as the one on Home. Verification is
            demanded at the point of opening an AGM now, so Settings says nothing about it.

            The component still exists and still works (KycNudgeBanner) — it opens the
            verification sheet in place, and renders nothing for an already-verified user, so it
            needs no condition around it. To restore: uncomment the import and the line below.

            ⚠️ With Home's copy commented out too, KycNudgeBanner now has NO live consumer
            anywhere, so nothing will catch it breaking. Check it renders before trusting a
            revert. */}
        {/* <KycNudgeBanner message="Complete identity verification to unlock voting" /> */}

        {rows.map(({ key, icon: Icon, label, meta }) => (
          <button
            key={key}
            onClick={() => open(key)}
            className={cn(
              // Borderless white rows, per the frame. With the border gone, the open section is
              // marked with a ring instead.
              "flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3.5 text-left shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]",
              section === key && "ring-1 ring-foreground/15",
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-foreground/80" strokeWidth={1.6} />
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
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3.5 text-left shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
        >
          <span className="flex items-center gap-3">
            <LogOut className="h-5 w-5 shrink-0 text-red-600" strokeWidth={1.6} />
            <span className="text-sm font-medium tracking-[-0.14px] text-red-600">Sign out</span>
          </span>
          <ChevronRight className="h-4 w-4 text-red-300" />
        </button>
      </div>

      {/* Right — the open section.
          On `lg` and up it's a full-height panel pinned to the window's right edge, per the
          frame: fixed, so it escapes the 960px content column the same way the top bar does,
          with its own divider and background, and its own scroll. `top-16` tucks it under the
          sticky 64px top bar, whose higher z-index covers the seam.
          Below `lg` it's an ordinary block in the page flow, shown only once a section is open. */}
      <aside
        className={cn(
          "lg:fixed lg:bottom-0 lg:right-0 lg:top-16 lg:z-10 lg:w-[var(--settings-panel-w)] lg:overflow-y-auto lg:border-l lg:border-foreground/10 lg:bg-[linear-gradient(180deg,#eef0f0_0%,#f6f7f7_100%)] lg:px-8 lg:py-8",
          !section && "hidden lg:block",
        )}
      >
        {section ? (
          panel[section]
        ) : (
          <div className="hidden h-full items-center justify-center text-center text-sm text-foreground/40 lg:flex">
            Choose a setting to view it here.
          </div>
        )}
      </aside>
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
