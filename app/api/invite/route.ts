import { NextResponse } from "next/server";
import { sendInviteEmail } from "@/services/email-service";

export async function POST(request: Request) {
  try {
    const { email, locale } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const inviteLink = new URL("/", request.url).toString();
    
    const { getSession } = await import("@/lib/session");
    const { findUserByEmail, updateGoogleToken } = await import("@/repositories/user.repository");
    const { refreshGoogleToken } = await import("@/services/google-auth-service");
    
    const session = await getSession();
    let accessToken: string | undefined = undefined;

    if (session?.email) {
      const user = await findUserByEmail(session.email);
      if (user?.googleToken) {
        accessToken = user.googleToken.access_token;
        
        // Basic check if we should refresh (ideally check expiry, but Gmail returns 401 if expired)
        // For robustness, we can try to refresh if it fails, or just refresh always if close to expiry.
        // Here we'll just try to use it and let the service handle errors.
        // Actually, let's just refresh if we have a refresh_token to be safe.
        if (user.googleToken.refresh_token) {
          try {
            const newTokens = await refreshGoogleToken(user.googleToken.refresh_token);
            accessToken = newTokens.access_token;
            // Update DB with new access token
            await updateGoogleToken(session.email, { ...user.googleToken, ...newTokens });
          } catch (e) {
            console.error("Failed to refresh Google token:", e);
          }
        }
      }
    }
    
    const ok = await sendInviteEmail({
      to: email,
      inviteLink,
      locale: (locale as "en" | "hu" | "ar") || "en",
      accessToken
    });

    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error("Invite API error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}
