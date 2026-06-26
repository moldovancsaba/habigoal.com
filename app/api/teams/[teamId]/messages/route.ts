import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { insertTeamMessage } from "@/repositories/team-messages.repository";
import { getTeamById } from "@/repositories/team.repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!["admin", "club_management", "trainer", "performance_coach", "physio"].includes(user.primaryRole)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { teamId } = await params;
    const team = await getTeamById(teamId);
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    const canManageTeam = user.primaryRole === "admin" || user.primaryRole === "club_management" || team.trainerEmails.includes(user.email.toLowerCase());
    if (!canManageTeam) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const body = await request.json();
    const recipientId = typeof body?.recipientId === "string" ? body.recipientId.trim() : "";
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
    if (!recipientId || !text) return NextResponse.json({ error: "recipientId and text are required" }, { status: 400 });
    if (!team.athleteIds.includes(recipientId)) return NextResponse.json({ error: "Recipient is not assigned to this team" }, { status: 400 });

    const message = await insertTeamMessage({
      teamId,
      recipientId,
      text,
      senderEmail: user.email,
      senderName: user.name
    });

    return NextResponse.json({ success: true, message });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
