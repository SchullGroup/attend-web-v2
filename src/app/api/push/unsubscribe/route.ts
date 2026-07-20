import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
    }
    const encoded = encodeURIComponent(body.endpoint);
    const response = await fetch(`${API_URL}/api/v1/devices/${encoded}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[push/unsubscribe] error", error);
    return NextResponse.json(
      { status: false, message: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
