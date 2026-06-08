import { NextRequest, NextResponse } from "next/server";
import { updateConnectionStatus } from "@/repositories/device-connection.repository";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const { connectionId } = await params;
    // Auth check here...

    // In a real implementation, we would call the vendor API to revoke the token
    // e.g., await ouraConnector.revokeAccess(connection);

    await updateConnectionStatus(connectionId, "revoked", "Revoked by user");

    return NextResponse.json({ success: true, message: "Device connection revoked" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error revoking device connection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
