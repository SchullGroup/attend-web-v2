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
  ChevronDown,
} from "lucide-react";
import { cn, initialsFor } from "@/lib/utils";
import { useLogout } from "@/api/auth/hooks";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { useGetEvent, useGuestEventView } from "@/api/events/hooks";
import { GUEST_TOKEN_KEY, clearGuestSession } from "@/lib/guest-session";
import { useGetNotifications } from "@/api/notifications/hooks";
import { useUserStore, mapKycStatus } from "@/lib/user-store";
import { useSession } from "@/hooks/useSession";
import Cookies from "js-cookie";

// Shell chrome is Figma's (777:5814 / 777:5815): a 259px sidebar on #f6f6f6, black-2%
// sidebar/header tints, pill nav items, an account caret menu, a per-section header
// title, and an 818px content column. OUR logic is grafted on unchanged: guest session
// + disabled guest tabs, the guest banner, guest-aware event lookup for tab
// highlighting, and the guest-vs-participant sign-out.

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
// Figma's sidebar has 5 items (it folds General into Launches); we keep our 6 —
// General stays a top-level destination here, and the last tab stays "Profile".
const NAV = [
  { label: "Home", href: "/", icon: House, match: (p: string, m?: string) => p === "/" },
  { label: "AGM", href: "/agm", icon: Building2, match: (p: string, m?: string) => p.startsWith("/agm") || isAgm(m) },
  { label: "Innovation", href: "/hackathon", icon: Lightbulb, match: (p: string, m?: string) => p.startsWith("/hackathon") || isInnovation(m) },
  { label: "Launches", href: "/events", icon: Rocket, match: (p: string, m?: string) => p.startsWith("/events") && !p.startsWith("/events/qr-checkin") && !isAgm(m) && !isInnovation(m) && !isGeneral(m) },
  { label: "General", href: "/general", icon: CalendarDays, match: (p: string, m?: string) => p.startsWith("/general") || isGeneral(m) },
  { label: "Profile", href: "/profile", icon: UserIcon, match: (p: string, m?: string) => p.startsWith("/profile") },
];

// Figma titles the top bar per-section ("Events" on Home, "AGM" on /agm, etc.)
// — a short static label per top-level route, not the page's own H1.
// `sub` is optional — Figma gives the Innovation section a two-line title block in the
// bar (title + tagline) where other sections get just a short label. Where a `sub` is
// set, the page must NOT also render its own heading, or the two stack up.
const SECTION_TITLE: { test: (p: string) => boolean; label: string; sub?: string }[] = [
  { test: (p) => p === "/", label: "Events" },
  { test: (p) => p.startsWith("/agm"), label: "AGM" },
  // The challenge brief titles the bar "About challenge" (Figma); the other
  // /hackathon/* routes keep the section name.
  { test: (p) => /^\/hackathon\/(?!apply|resources|certificate|my-applications|submit)[^/]+$/.test(p), label: "About challenge" },
  { test: (p) => p.startsWith("/hackathon"), label: "Innovation Challenges", sub: "Compete, build and win" },
  { test: (p) => p.startsWith("/general"), label: "General" },
  // Only the list route gets the two-line block; detail/sub-routes keep the short label.
  { test: (p) => p === "/events", label: "Launches & Events", sub: "Product launches & live events" },
  // The event detail page titles the bar "About event" (Figma), excluding the sibling
  // routes that live under /events/.
  { test: (p) => /^\/events\/(?!archive|gallery|live|qr-checkin)[^/]+$/.test(p), label: "About event" },
  { test: (p) => p.startsWith("/events"), label: "Launches" },
  { test: (p) => p.startsWith("/profile"), label: "Profile" },
  { test: (p) => p.startsWith("/notifications"), label: "Notifications" },
  { test: (p) => p.startsWith("/search"), label: "Search" },
  { test: (p) => p.startsWith("/qr-checkin"), label: "Check-in" },
];

// A guest has no account, so every participant route behind these tabs 401s. Rather than
// hide them — which would leave a guest wondering what the app is — they stay visible but
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
      // Must clear the sessionStorage token too — dropping only the cookies left the
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
  // live routes the id is a query param (/events/live?eventId=…), not a path segment
  // (the segment is "live"), so read it from the URL there. We read via window rather
  // than useSearchParams to keep this shell out of a Suspense boundary. Keyed on
  // pathname — covers navigating into a live room, the case that mis-highlighted.
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

  const section = SECTION_TITLE.find((s) => s.test(pathname));
  const sectionTitle = section?.label ?? "Attend";
  const sectionSub = section?.sub;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white md:bg-[#f6f6f6]">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[259px] flex-col border-r border-foreground/10 bg-black/[0.02] md:flex">
        <div className="px-8 pt-6">
          <img src="/attend-logo.png" alt="Attend" style={{ height: 22, width: "auto" }} />
        </div>
        <nav className="flex flex-col gap-1 px-8 pt-14">
          {NAV.map((item) => {
            const active = item.match(pathname, currentModule);
            const Icon = item.icon;
            if (isGuest && !GUEST_ALLOWED.has(item.href)) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="flex cursor-not-allowed select-none items-center gap-2.5 rounded-full px-3 py-3 text-[15px] tracking-[-0.3px] text-foreground/40"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-3 py-3 text-[15px] tracking-[-0.3px] transition-colors",
                  active ? "bg-primary/10 font-medium text-primary" : "text-foreground/70 hover:bg-foreground/[0.04]",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User card — Figma opens a caret menu here rather than a separate sign-out row */}
        <div className="relative mt-auto px-8 pb-8">
          {accountMenuOpen && (
            <>
              {/* Click-away catcher — the menu is otherwise only dismissable via the caret. */}
              <div className="fixed inset-0 z-0" onClick={() => setAccountMenuOpen(false)} aria-hidden />
              <div className="absolute bottom-[calc(100%+8px)] left-8 right-8 z-10 overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]">
                {/* A guest has no profile to view — /profile 401s for them. */}
                {!isGuest && (
                  <Link
                    href="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-foreground hover:bg-foreground/[0.04]"
                  >
                    View profile
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="relative z-10 flex w-full items-center gap-2 rounded-full bg-white p-1.5 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {displayInitials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium tracking-[-0.28px] text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs tracking-[-0.12px] text-foreground/60">
                {isGuest ? "Guest" : displayEmail}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-foreground/60" />
          </button>
        </div>
      </aside>

      {/* Top header */}
      {/* The background MUST be opaque — this bar is sticky, so a translucent fill
          (it was bg-black/[0.02]) let page content scroll visibly through it. These are
          the opaque equivalents of that 2% tint over each breakpoint's page background:
          white → #fafafa, #f6f6f6 → #f1f1f1. */}
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-[#fafafa] md:bg-[#f1f1f1] md:pl-[259px]">
        {isGuest && (
          <div className="flex select-none items-center justify-center gap-1.5 border-b border-slate-800 bg-slate-900 px-4 py-1.5 text-center text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Guest
          </div>
        )}
        {/* Same container as <main> below, so the section title lines up with the
            content's left edge and the bell with its right edge, end to end. */}
        {/* min-h rather than h, so the bar grows for the sections that carry a
            two-line title block (see SECTION_TITLE `sub`) and stays 64px otherwise. */}
        <div className="mx-auto flex min-h-16 max-w-[1152px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            {!isExactRoot && (
              <button onClick={handleBack} aria-label="Go back" className="-ml-2 rounded-lg p-2 text-foreground/60 transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <img src="/attend-logo.png" alt="Attend" style={{ height: 20, width: "auto" }} />
          </div>

          <div className="hidden md:block">
            <p className="text-xl font-medium tracking-[-0.8px] text-foreground">{sectionTitle}</p>
            {sectionSub && (
              <p className="text-sm tracking-[-0.14px] text-foreground/60">{sectionSub}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="h-10 w-[255px] rounded-full border border-foreground/5 bg-foreground/[0.03] pl-10 pr-3 text-sm tracking-[-0.14px] placeholder:text-foreground/40 focus-visible:border-primary focus-visible:outline-none"
                placeholder="Search events, companies, challenges…"
              />
            </div>
            <button
              type="button"
              onClick={toggleNotifications}
              aria-label={onNotifications ? "Close notifications" : "Open notifications"}
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-full",
                onNotifications ? "bg-foreground/10" : "bg-white",
              )}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <Link
              href="/profile"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary md:hidden"
            >
              {displayInitials}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="md:pl-[259px]">
        {/* Figma's frame caps content at 818px, which was drawn for a ~1440px canvas and
            reads cramped on a wide monitor — widened to 1280px on request. */}
        <div className="mx-auto max-w-[1152px] px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-16">
          {children}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-white/95 backdrop-blur md:hidden">
        <ul className="flex items-center justify-around px-2 py-2">
          {NAV.map((item) => {
            const active = item.match(pathname, currentModule);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                {isGuest && !GUEST_ALLOWED.has(item.href) ? (
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed select-none flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium text-foreground/40"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium",
                      active ? "text-primary" : "text-foreground/60",
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
