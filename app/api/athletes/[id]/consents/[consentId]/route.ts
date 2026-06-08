import { NextRequest, NextResponse } from "next/server";
import { updateConsentStatus } from "@/repositories/consent.repository";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; consentId: string }> }
) {
  try {
    const { id: athleteId, consentId } = await params;
    // Auth check should happen here...
    
    const now = new Date().toISOString();
    
    await updateConsentStatus(consentId, "withdrawn", {
      withdrawnAt: now,
      withdrawnBy: athleteId, // Assuming athlete withdraws their own
    });

    return NextResponse.json({ success: true, message: "Consent withdrawn" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error withdrawing consent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
