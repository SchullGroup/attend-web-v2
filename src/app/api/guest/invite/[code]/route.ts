import { NextResponse } from "next/server";

// Item B — Public preview endpoint used by the guest join page to show event
// name + capabilities before the guest fills the form.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  try {
    const upstream = await fetch(
      `${API_URL}/api/v1/guest/invites/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error("[guest/invite] error", error);
    return NextResponse.json(
      { status: false, message: "Could not fetch invite" },
      { status: 500 },
    );
  }
}
