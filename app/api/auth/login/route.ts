import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/auth-service";
import { cookies } from "next/headers";
import { env } from "@/config/env";

export async function GET(request: Request) {
  const referer = request.headers.get("referer");
  const locale = referer?.match(/\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";

  if (!env.surveyEnforceAuth) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

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
