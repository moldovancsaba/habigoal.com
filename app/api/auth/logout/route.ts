import { deleteSession } from "@/lib/session";
import { env } from "@/config/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await deleteSession();

  if (env.surveyEnforceAuth && env.ssoLogoutUrl) {
    const logoutUrl = new URL(env.ssoLogoutUrl);
    logoutUrl.searchParams.set("redirect_uri", new URL("/", request.url).toString());
    return NextResponse.redirect(logoutUrl);
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
