import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define the paths that do NOT require authentication
// Item L — /bvn-recover: shareholders without email/phone use BVN to sign in.
// Item B — /join/... : guest redemption before session issuance; /e/... : deep-link shim
const publicRoutes = ["/login", "/register", "/verify", "/forgot-password", "/reset-password", "/bvn-recover", "/join", "/e"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current route is in our list of public routes
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Check for the refreshToken or accessToken to determine auth status
  const hasToken = !!request.cookies.get("accessToken");

  // If trying to access a protected route without a token, redirect to login
  if (!isPublicRoute && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login page WITH a token, redirect to dashboard/home
  if (isPublicRoute && hasToken && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.svg|.*\\.gif).*)"],
};
