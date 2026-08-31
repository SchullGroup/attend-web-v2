import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Item B — Guest redemption BFF proxy.
// Forwards to backend; on success sets the guest session cookie so subsequent
// participant API calls include the guest JWT.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${API_URL}/api/v1/guest/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.status) {
      return NextResponse.json(data, { status: upstream.status || 400 });
    }
    // Backend returns { token, refreshToken?, eventId, expiresAt, capabilities }
    const { token, refreshToken, ...rest } = data.data ?? {};
    const cookieStore = await cookies();
    if (token) {
      // Guest sessions live in the standard accessToken cookie — the JWT sub
      // is `guest:{sessionId}` so route protection can distinguish.
      cookieStore.set("accessToken", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60,
        path: "/",
      });
    }
    if (refreshToken) {
      cookieStore.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60,
        path: "/",
      });
    }
    return NextResponse.json({ status: true, data: rest });
  } catch (error) {
    console.error("[guest/redeem] error", error);
    return NextResponse.json(
      { status: false, message: "Could not redeem guest code." },
      { status: 500 },
    );
  }
}
