import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { createTeamInvitation, InvitationError, listTeamInvitations } from "@/services/team-invitation.service";
import type { TeamInvitationRole } from "@/types/team-invitation";

function handleError(error: unknown) {
  if (error instanceof InvitationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "Failed to process invitation" }, { status: 500 });
}

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { teamId } = await params;
    const invitations = await listTeamInvitations({ actor: user, teamId });
    return NextResponse.json({ invitations });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { teamId } = await params;
    const body = (await request.json().catch(() => null)) as { email?: unknown; role?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email : "";
    const role: TeamInvitationRole = body?.role === "trainer" ? "trainer" : "athlete";
    const invitation = await createTeamInvitation({ actor: user, teamId, email, role });
    return NextResponse.json({ invitation });
  } catch (error) {
    return handleError(error);
  }
}
