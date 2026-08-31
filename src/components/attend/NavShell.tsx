"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  House,
  Building2,
  Lightbulb,
  Rocket,
  CalendarDays,
  User as UserIcon,
  Bell,
  Search,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { cn, initialsFor } from "@/lib/utils";
import { useGetMe, useLogout } from "@/api/auth/hooks";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { useGetEvent, useGuestEventView } from "@/api/events/hooks";
import { GUEST_TOKEN_KEY, clearGuestSession } from "@/lib/guest-session";
import { useGetNotifications } from "@/api/notifications/hooks";
import { useUserStore, mapKycStatus } from "@/lib/user-store";
import { useSession } from "@/hooks/useSession";
import Cookies from "js-cookie";

// Extract the event id from an /events/[id] detail path so the nav can look up
// that event's type and keep the right tab active.
function eventDetailId(pathname: string) {
  return pathname.match(/^\/events\/([^/]+)/)?.[1] ?? "";
}
const isAgm = (m?: string) => m === "AGM" || m === "AGM_EGM";
const isInnovation = (m?: string) => m === "HACKATHON" || m === "INNOVATION_CHALLENGE";
const isGeneral = (m?: string) => m === "GENERAL" || m === "GENERAL_EVENT";

// `m` is the type of the event currently being viewed (if on /events/[id]), so
// AGM / Innovation detail pages highlight the correct tab instead of Launches.
const NAV = [
  { label: "Home", href: "/", icon: House, match: (p: string, m?: string) => p === "/" },
  { label: "AGM", href: "/agm", icon: Building2, match: (p: string, m?: string) => p.startsWith("/agm") || isAgm(m) },
  { label: "Innovation", href: "/hackathon", icon: Lightbulb, match: (p: string, m?: string) => p.startsWith("/hackathon") || isInnovation(m) },
  { label: "Launches", href: "/events", icon: Rocket, match: (p: string, m?: string) => p.startsWith("/events") && !p.startsWith("/events/qr-checkin") && !isAgm(m) && !isInnovation(m) && !isGeneral(m) },
  { label: "General", href: "/general", icon: CalendarDays, match: (p: string, m?: string) => p.startsWith("/general") || isGeneral(m) },
  { label: "Profile", href: "/profile", icon: UserIcon, match: (p: string, m?: string) => p.startsWith("/profile") },
];

// A guest has no account, so every participant route behind these tabs 401s. Rather than
// hide them ΓÇö which would leave a guest wondering what the app is ΓÇö they stay visible but
// inert, with the not-allowed cursor as the signal. AGM is the exception: a guest is
// invited to exactly one meeting and reaches it through the AGM section.
const GUEST_ALLOWED = new Set(["/agm"]);

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const onNotifications = pathname === "/notifications";
  // The bell toggles: open notifications, or (if already there) go back to the page
  // you were on. Fall back to home if there's no history to return to.
  function toggleNotifications() {
    if (onNotifications) {
      if (typeof window !== "undefined" && window.history.length > 1) router.back();
      else router.push("/");
    } else {
      router.push("/notifications");
    }
  }
  const { setKycStatus } = useUserStore();
  const session = useSession();
  const isGuest = session.type === "GUEST";
  const { mutate: logout } = useLogout();
 
  const hasToken = typeof window !== "undefined" && !!Cookies.get("accessToken");
  const currentUser = session.user;
  const displayName = currentUser?.fullName || "User";
  const displayEmail = currentUser?.email || "";
  const displayInitials = initialsFor(displayName);

  function handleSignOut() {
    if (isGuest) {
      // Must clear the sessionStorage token too ΓÇö dropping only the cookies left the
      // guest token behind, so useSession still reported GUEST after "signing out".
      clearGuestSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } else {
      logout();
    }
  }

  const { data: kycData } = useGetKycStatus(hasToken);
  useEffect(() => {
    if (kycData?.data?.kycStatus) {
      setKycStatus(mapKycStatus(kycData.data.kycStatus));
    }
  }, [kycData, setKycStatus]);

  const { data: notifData } = useGetNotifications({ size: 1 }, hasToken);
  const unreadCount = notifData?.data?.unreadCount ?? 0;

  const [searchQuery, setSearchQuery] = useState("");
  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  // Resolve the event being viewed so its module highlights the right tab. On the
  // live routes the id is a query param (/events/live?eventId=ΓÇª), not a path segment
  // (the segment is "live"), so read it from the URL there. We read via window rather
  // than useSearchParams to keep this shell out of a Suspense boundary. Keyed on
  // pathname ΓÇö covers navigating into a live room, the case that mis-highlighted.
  const [detailId, setDetailId] = useState("");
  useEffect(() => {
    const isLiveRoute = pathname === "/events/live" || pathname === "/agm/live" || pathname === "/qr-checkin";
    if (isLiveRoute && typeof window !== "undefined") {
      setDetailId(new URLSearchParams(window.location.search).get("eventId") ?? "");
    } else {
      setDetailId(eventDetailId(pathname));
    }
  }, [pathname]);
  // A guest can't read the participant event endpoint (401), which left currentModule
  // undefined and made the nav highlight the wrong section. They have their own view.
  const [guestToken, setGuestToken] = useState("");
  useEffect(() => {
    if (isGuest) setGuestToken(sessionStorage.getItem(GUEST_TOKEN_KEY) ?? "");
  }, [isGuest]);

  const { data: eventDetail } = useGetEvent(detailId, !isGuest);
  const { data: guestDetail } = useGuestEventView(
    detailId,
    guestToken,
    isGuest && !!guestToken && !!detailId,
  );
  const currentModule = (isGuest ? guestDetail?.data : eventDetail?.data)?.eventType;

  const isExactRoot = NAV.some((item) => item.href === pathname) || pathname === "/notifications";
  const canGoBack = !isExactRoot && typeof window !== "undefined" && window.history.length > 1;

  function handleBack() {
    if (canGoBack) router.back();
    else router.push("/");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white md:flex">
        <div className="border-b border-border px-6 py-4 flex items-center" style={{ minHeight: 80 }}>
          <img src="/attend-logo.png" alt="Attend" style={{ height: 28, width: "auto" }} />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = item.match(pathname, currentModule);
            const Icon = item.icon;
            if (isGuest && !GUEST_ALLOWED.has(item.href)) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="flex cursor-not-allowed select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/45"
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 space-y-1">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {displayInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isGuest ? "Guest" : displayEmail}
              </p>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top header */}
      <header className="sticky top-0 z-20 border-b border-border bg-white/85 backdrop-blur md:pl-64">
        {isGuest && (
          <div className="bg-slate-900 text-white text-center py-1.5 px-4 text-xs font-semibold select-none flex items-center justify-center gap-1.5 border-b border-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Guest
          </div>
        )}
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            {!isExactRoot && (
              <button onClick={handleBack} aria-label="Go back" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <img src="/attend-logo.png" alt="Attend" style={{ height: 22, width: "auto" }} />
          </div>
          <div className="hidden flex-1 items-center gap-4 md:flex max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="h-10 w-full rounded-xl border border-input bg-muted/40 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
                placeholder="Search events, companies, challengesΓÇª"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleNotifications}
              aria-label={onNotifications ? "Close notifications" : "Open notifications"}
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-muted",
                onNotifications ? "bg-muted" : "bg-white",
              )}
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <Link
              href="/profile"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary md:hidden"
            >
              {displayInitials}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-12">
          {children}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur md:hidden">
        <ul className="flex items-center justify-around px-2 py-2">
          {NAV.map((item) => {
            const active = item.match(pathname, currentModule);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                {isGuest && !GUEST_ALLOWED.has(item.href) ? (
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed select-none flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium text-muted-foreground/45"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
