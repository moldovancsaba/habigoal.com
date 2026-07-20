import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { acceptTeamInvitation, InvitationError, revokeTeamInvitation } from "@/services/team-invitation.service";

function handleError(error: unknown) {
  if (error instanceof InvitationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "Failed to process invitation" }, { status: 500 });
}

// Accept an invitation addressed to the signed-in user.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { id } = await params;
    const invitation = await acceptTeamInvitation({ actor: user, invitationId: id });
    return NextResponse.json({ invitation });
  } catch (error) {
    return handleError(error);
  }
}

// Revoke an invitation (team manager / admin only).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { id } = await params;
    const invitation = await revokeTeamInvitation({ actor: user, invitationId: id });
    return NextResponse.json({ invitation });
  } catch (error) {
    return handleError(error);
  }
}
