import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Item K — Web Push subscription BFF proxy.
// Forwards the browser's PushSubscription to the backend as a DeviceToken.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/v1/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        platform: body.platform ?? "WEB",
        token: body.endpoint,
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
      }),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[push/subscribe] error", error);
    return NextResponse.json(
      { status: false, message: "Failed to register push subscription" },
      { status: 500 },
    );
  }
}
