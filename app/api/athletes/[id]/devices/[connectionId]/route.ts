import { NextRequest, NextResponse } from "next/server";
import { canAccessAthleteIqAthlete, getAuthUser } from "@/lib/access";
import { findConnectionById, updateConnectionStatus } from "@/repositories/device-connection.repository";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const { id: athleteId, connectionId } = await params;
    const user = await getAuthUser({ productSurface: "athlete-iq" });
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!(await canAccessAthleteIqAthlete(user, athleteId))) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const connection = await findConnectionById(connectionId);
    if (!connection || connection.athleteId !== athleteId) {
      return NextResponse.json({ error: "Device connection not found" }, { status: 404 });
    }

    await updateConnectionStatus(connectionId, "revoked", "Revoked by user");

    return NextResponse.json({ success: true, message: "Device connection revoked" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error revoking device connection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
