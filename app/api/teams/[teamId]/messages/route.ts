import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { insertTeamBroadcast, insertTeamMessage, listTeamMessages } from "@/repositories/team-messages.repository";
import { getTeamById } from "@/repositories/team.repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { teamId } = await params;
    const team = await getTeamById(teamId);
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const requestedRecipient = searchParams.get("recipientId")?.trim() || undefined;
    const before = searchParams.get("before")?.trim() || undefined;
    const search = searchParams.get("q")?.trim() || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 30, 1), 100);

    const isManager =
      user.primaryRole === "admin" ||
      user.primaryRole === "club_management" ||
      team.trainerEmails.includes(user.email.toLowerCase());
    const isRecipientSelf =
      user.primaryRole === "athlete" &&
      Boolean(user.athleteId) &&
      requestedRecipient === user.athleteId &&
      team.athleteIds.includes(user.athleteId as string);

    // A manager searching with no recipientId searches across the whole team's
    // threads at once; athletes are never allowed a cross-thread view, search
    // or not, so isRecipientSelf still gates the non-search case for them.
    if (!isManager && !isRecipientSelf) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Athletes may only ever read their own thread, regardless of the query.
    const recipientId = isManager ? requestedRecipient : (user.athleteId as string);

    const messages = await listTeamMessages(teamId, { recipientId, limit, before, search });
    const nextCursor = messages.length === limit ? messages[messages.length - 1].createdAt : undefined;

    return NextResponse.json({ messages, nextCursor });
  } catch {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

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
    const broadcast = body?.broadcast === true;
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    if (broadcast) {
      if (team.athleteIds.length === 0) return NextResponse.json({ error: "Team has no athletes to message" }, { status: 400 });
      const messages = await insertTeamBroadcast({
        teamId,
        athleteIds: team.athleteIds,
        text,
        senderEmail: user.email,
        senderName: user.name
      });
      return NextResponse.json({ success: true, messages });
    }

    const recipientId = typeof body?.recipientId === "string" ? body.recipientId.trim() : "";
    if (!recipientId) return NextResponse.json({ error: "recipientId and text are required" }, { status: 400 });
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
