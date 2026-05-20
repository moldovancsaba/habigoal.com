import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/auth-service";
import { cookies } from "next/headers";
import { env } from "@/config/env";

function sanitizeReturnTo(input: string | null, fallbackLocale: string) {
  if (!input) return `/${fallbackLocale}/dashboard`;
  if (!input.startsWith("/")) return `/${fallbackLocale}/dashboard`;
  if (input.startsWith("//")) return `/${fallbackLocale}/dashboard`;
  if (input.startsWith("/api/")) return `/${fallbackLocale}/dashboard`;
  return input;
}

export async function GET(request: NextRequest) {
  const referer = request.headers.get("referer");
  const locale = referer?.match(/\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";
  const next = sanitizeReturnTo(request.nextUrl.searchParams.get("next"), locale);

  if (!env.habigoalEnforceAuth) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const state = Math.random().toString(36).substring(7);
  const authUrl = getAuthorizationUrl(state, request);

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
    path: "/"
  });
  cookieStore.set("oauth_return_to", next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    sameSite: "lax",
    path: "/"
  });

  return NextResponse.redirect(authUrl);
}
