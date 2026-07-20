import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { listMyPendingInvitations } from "@/services/team-invitation.service";

// Pending invitations addressed to the signed-in user's email.
export async function GET() {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const invitations = await listMyPendingInvitations(user.email);
    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}
