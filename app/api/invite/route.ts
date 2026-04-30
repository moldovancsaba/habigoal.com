import { NextResponse } from "next/server";
import { sendInviteEmail } from "@/services/email-service";

export async function POST(request: Request) {
  try {
    const { email, locale } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const inviteLink = new URL("/", request.url).toString();
    
    const ok = await sendInviteEmail({
      to: email,
      inviteLink,
      locale: (locale as "en" | "hu" | "ar") || "en"
    });

    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error("Invite API error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}
