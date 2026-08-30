"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  House,
  Building2,
  Lightbulb,
  Rocket,
  User as UserIcon,
  Bell,
  Search,
  LogOut,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { cn, initialsFor } from "@/lib/utils";
import { useGetMe, useLogout } from "@/api/auth/hooks";
import { useGetKycStatus } from "@/api/kyc/hooks";
import { useGetEvent } from "@/api/events/hooks";
import { useGetNotifications } from "@/api/notifications/hooks";
import { useUserStore, mapKycStatus } from "@/lib/user-store";
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
// Figma's sidebar (777:5815) has 5 items — General has no top-level tab there,
// same as the mobile app, where it's reached as a Home filter chip instead.
const NAV = [
  { label: "Home", href: "/", icon: House, match: (p: string, m?: string) => p === "/" },
  { label: "AGM", href: "/agm", icon: Building2, match: (p: string, m?: string) => p.startsWith("/agm") || isAgm(m) },
  { label: "Innovation", href: "/hackathon", icon: Lightbulb, match: (p: string, m?: string) => p.startsWith("/hackathon") || isInnovation(m) },
  { label: "Launches", href: "/events", icon: Rocket, match: (p: string, m?: string) => (p.startsWith("/events") && !isAgm(m) && !isInnovation(m) && !isGeneral(m)) || p.startsWith("/general") || isGeneral(m) },
  { label: "Account", href: "/profile", icon: UserIcon, match: (p: string, m?: string) => p.startsWith("/profile") },
];

// Figma titles the top bar per-section ("Events" on Home, "AGM" on /agm, etc.)
// — a short static label per top-level route, not the page's own H1.
const SECTION_TITLE: { test: (p: string) => boolean; label: string }[] = [
  { test: (p) => p === "/", label: "Events" },
  { test: (p) => p.startsWith("/agm"), label: "AGM" },
  { test: (p) => p.startsWith("/hackathon"), label: "Innovation" },
  { test: (p) => p.startsWith("/events") || p.startsWith("/general"), label: "Launches" },
  { test: (p) => p.startsWith("/profile"), label: "Account" },
  { test: (p) => p.startsWith("/notifications"), label: "Notifications" },
  { test: (p) => p.startsWith("/search"), label: "Search" },
];

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
  const { data: userResponse } = useGetMe();
  const { mutate: logout } = useLogout();

  const hasToken = typeof window !== "undefined" && !!Cookies.get("accessToken");
  const currentUser = userResponse?.data;
  const displayName = currentUser?.fullName || "User";
  const displayEmail = currentUser?.email || "";
  const displayInitials = currentUser?.initials || initialsFor(displayName);

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
    const isLiveRoute = pathname === "/events/live" || pathname === "/agm/live";
    if (isLiveRoute && typeof window !== "undefined") {
      setDetailId(new URLSearchParams(window.location.search).get("eventId") ?? "");
    } else {
      setDetailId(eventDetailId(pathname));
    }
  }, [pathname]);
  const { data: eventDetail } = useGetEvent(detailId);
  const currentModule = eventDetail?.data?.eventType;

  const isExactRoot = NAV.some((item) => item.href === pathname) || pathname === "/notifications";
  const canGoBack = !isExactRoot && typeof window !== "undefined" && window.history.length > 1;

  function handleBack() {
    if (canGoBack) router.back();
    else router.push("/");
  }

  const sectionTitle = SECTION_TITLE.find((s) => s.test(pathname))?.label ?? "Attend";
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white md:bg-[#f6f6f6]">
      {/* Sidebar (desktop) — Figma 777:5815 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[259px] flex-col border-r border-foreground/10 bg-black/[0.02] md:flex">
        <div className="px-8 pt-6">
          <img src="/attend-logo.png" alt="Attend" style={{ height: 22, width: "auto" }} />
        </div>
        <nav className="flex flex-col gap-1 px-8 pt-14">
          {NAV.map((item) => {
            const active = item.match(pathname, currentModule);
            const Icon = item.icon;
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
            <div className="absolute bottom-[calc(100%+8px)] left-8 right-8 overflow-hidden rounded-xl border border-foreground/10 bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]">
              <Link
                href="/profile"
                onClick={() => setAccountMenuOpen(false)}
                className="block px-4 py-3 text-sm text-foreground hover:bg-foreground/[0.04]"
              >
                View profile
              </Link>
              <button
                onClick={() => logout()}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
          <button
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-full bg-white p-1.5 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {displayInitials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium tracking-[-0.28px] text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs tracking-[-0.12px] text-foreground/60">
                {displayEmail}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-foreground/60" />
          </button>
        </div>
      </aside>

      {/* Top header — Figma 777:5814 */}
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-black/[0.02] md:pl-[259px]">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            {!isExactRoot && (
              <button onClick={handleBack} aria-label="Go back" className="-ml-2 rounded-lg p-2 text-foreground/60 transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <img src="/attend-logo.png" alt="Attend" style={{ height: 20, width: "auto" }} />
          </div>

          <p className="hidden text-xl font-medium tracking-[-0.8px] text-foreground md:block">
            {sectionTitle}
          </p>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="h-10 w-[255px] rounded-full border border-foreground/5 bg-foreground/[0.03] pl-10 pr-3 text-sm tracking-[-0.14px] placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary"
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
        <div className="mx-auto max-w-[818px] px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-16">
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
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
