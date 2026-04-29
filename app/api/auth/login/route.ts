import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/auth-service";
import { cookies } from "next/headers";

export async function GET(_request: NextRequest) {
  const state = Math.random().toString(36).substring(7);
  const authUrl = getAuthorizationUrl(state);

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
    path: "/"
  });

  return NextResponse.redirect(authUrl);
}
