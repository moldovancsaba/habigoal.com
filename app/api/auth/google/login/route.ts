import { NextResponse } from "next/server";
import { getGoogleAuthorizationUrl } from "@/services/google-auth-service";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const state = Math.random().toString(36).substring(7);
    const authUrl = getGoogleAuthorizationUrl(state);

    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
      sameSite: "lax",
      path: "/"
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google login initiator error:", error);
    return new NextResponse(
      `Google Configuration Error: ${error.message}. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your .env.local`,
      { status: 500 }
    );
  }
}
