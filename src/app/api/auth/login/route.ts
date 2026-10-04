import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isOrganiserAccount, ORGANISER_ACCOUNT_CODE, ORGANISER_ACCOUNT_MESSAGE } from "@/lib/roles";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.status || data.status === "FAILURE") {
      return NextResponse.json(data, { status: response.status || 400 });
    }

    const { refreshToken, ...restData } = data.data;

    // Organiser accounts can't use the participant app. Checked here, server-side, so no
    // session cookie is ever set for them. The backend has already issued tokens, so revoke
    // them rather than leave a live session behind.
    if (isOrganiserAccount(restData.role, restData.roles)) {
      if (restData.token) {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${restData.token}` },
        }).catch((err) => console.error("Revoking organiser login failed:", err));
      }
      return NextResponse.json(
        { status: false, code: ORGANISER_ACCOUNT_CODE, message: ORGANISER_ACCOUNT_MESSAGE },
        { status: 403 },
      );
    }

    // Set HttpOnly cookie for refreshToken
    const cookieStore = await cookies();
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Return the response without the refreshToken in the body
    return NextResponse.json({ ...data, data: restData }, { status: 200 });
  } catch (error) {
    console.error("Login Proxy Error:", error);
    return NextResponse.json(
      { status: "FAILURE", message: "Internal server error during login" },
      { status: 500 },
    );
  }
}
