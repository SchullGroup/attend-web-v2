import { NextResponse } from "next/server";

// Public list of guest-joinable events, backing the JOIN AS GUEST / "Guest
// events" browse screen. Same backend namespace and proxy pattern as the
// sibling invite/redeem routes; the mobile app already calls this endpoint
// directly (apis/guest/request/getGuestEvents.ts) via GET /guest/events on
// its own base URL, which resolves to this same /api/v1/guest/events path.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  try {
    const upstream = await fetch(
      `${API_URL}/api/v1/guest/events${qs ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error("[guest/events] error", error);
    return NextResponse.json(
      { status: false, message: "Could not fetch guest events" },
      { status: 500 },
    );
  }
}
