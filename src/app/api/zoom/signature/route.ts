import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Generates the Zoom Meeting SDK join signature server-side (the SDK secret must
// never reach the browser). Temporary — the real backend will own this endpoint.
export async function POST(request: Request) {
  // ZOOM_SDK_KEY matches the backend's own variable name. The old NEXT_PUBLIC_ name is still
  // read so environments set up with it keep working. The key never needed to be public: this
  // route runs on the server and returns it in its response.
  const sdkKey = process.env.ZOOM_SDK_KEY || process.env.NEXT_PUBLIC_ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;
  if (!sdkKey || !sdkSecret) {
    return NextResponse.json(
      {
        error:
          "Zoom SDK credentials are not configured. Set ZOOM_SDK_KEY and ZOOM_SDK_SECRET.",
      },
      { status: 500 },
    );
  }

  const { meetingNumber, role = 0 } = await request.json().catch(() => ({}));
  if (!meetingNumber) {
    return NextResponse.json({ error: "meetingNumber is required." }, { status: 400 });
  }

  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  const payload = {
    appKey: sdkKey,
    sdkKey,
    mn: String(meetingNumber),
    role, // 0 = attendee, 1 = host
    iat,
    exp,
    tokenExp: exp,
  };

  const signature = jwt.sign(payload, sdkSecret, { algorithm: "HS256" });
  return NextResponse.json({ signature, sdkKey });
}
