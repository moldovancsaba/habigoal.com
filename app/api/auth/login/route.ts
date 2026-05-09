import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/auth-service";
import { cookies } from "next/headers";
import { createSession } from "@/lib/session";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    await createSession({
      id: "survey-dev-user",
      email: "dev@survey.local",
      name: "Survey Dev",
      role: "admin,conductor,observer"
    });
    const referer = request.headers.get("referer");
    const locale = referer?.match(/\/(hu|en|ar)(\/|$)/)?.[1] || "en";
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
