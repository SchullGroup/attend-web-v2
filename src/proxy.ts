import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define the paths that do NOT require authentication.
// `/guest` and `/guest-join` are the guest entry points, and `/join` is the legacy invite
// link that redirects into them ΓÇö a guest has no account, so requiring a token here would
// make guest access impossible to reach at all.
// `/landing` is the public marketing site; the prefix match also covers /landing/features/*.
// Landing page is currently disabled ΓÇö the route tree is commented out, so keeping it
// public would only expose a 404. Restore this entry alongside src/app/landing/.
const publicRoutes = [
  // "/landing",
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/guest",
  "/join",
];

// Routes a guest may enter once they've joined an event. They authenticate with an
// X-Guest-Token held in sessionStorage, which this middleware can't read ΓÇö so the join
// flow also sets a plain `isGuest` flag cookie purely so this check can see them.
const guestRoutes = ["/agm/live", "/events/live"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current route is in our list of public routes
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // A usable session needs an access token ΓÇö but a user whose short-lived access token
  // has been dropped (it expired, or the cookie got cleared) may still hold a valid
  // HttpOnly refresh token. Let those requests through so the client can silently mint a
  // fresh access token (see SessionBootstrap) instead of bouncing them to /login for no
  // reason. Middleware only checks *presence*, not validity; if the refresh token turns
  // out to be dead, the client's refresh fails and it redirects to /login then.
  const hasAccess = !!request.cookies.get("accessToken");
  const hasRefresh = !!request.cookies.get("refreshToken");
  const hasToken = hasAccess || hasRefresh;

  const isGuestAllowed =
    !!request.cookies.get("isGuest") &&
    guestRoutes.some((route) => pathname.startsWith(route));

  // Landing page disabled ΓÇö a logged-out visitor at "/" now falls through to the
  // protected-route check below and lands on /login, as it did before the marketing site.
  // if (pathname === "/" && !hasToken) {
  //   return NextResponse.redirect(new URL("/landing", request.url));
  // }

  // If trying to access a protected route without a token, redirect to login
  if (!isPublicRoute && !hasToken && !isGuestAllowed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in (a usable access token) and hitting /login ΓåÆ send home. Uses
  // hasAccess, not hasToken: a stale refresh-only cookie shouldn't yank them off /login
  // and back while the client is still deciding whether that refresh token is alive.
  if (isPublicRoute && hasAccess && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  // `.html` covers /zoom-meeting.html ΓÇö a static file in public/ that the Zoom SDK loads
  // in an iframe. Without it the guard redirected that iframe to /login, so the meeting
  // sat on "Connecting to the meetingΓÇª" forever for anyone without an accessToken.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.svg|.*\\.gif|.*\\.html).*)",
  ],
};
