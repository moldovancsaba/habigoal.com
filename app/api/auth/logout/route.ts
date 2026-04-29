import { env } from "@/config/env";
import { deleteSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await deleteSession();
  
  // Also log out from the SSO provider to ensure a full logout
  const ssoLogoutUrl = new URL(`${env.ssoBaseUrl}/logout`);
  // Try to pass the current app URL as a redirect if the SSO supports it
  ssoLogoutUrl.searchParams.set("redirect", new URL("/", request.url).toString());
  
  return NextResponse.redirect(ssoLogoutUrl);
}

export async function POST(_request: NextRequest) {
  await deleteSession();
  return NextResponse.json({ success: true });
}
