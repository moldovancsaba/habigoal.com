import { NextRequest, NextResponse } from "next/server";
import { updateConsentStatus } from "@/repositories/consent.repository";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { logAuditEvent } from "@/lib/audit";
import { jsonError } from "@/lib/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; consentId: string }> }
) {
  try {
    const { id: athleteId, consentId } = await params;

    // Authorization: only an authenticated user with access to this athlete may
    // withdraw consent (resolves the prior unauthenticated TODO).
    const user = await getAuthUser({ productSurface: "athlete-iq" });
    if (!user) {
      return jsonError("Authentication required", 401, "AUTH_REQUIRED");
    }
    if (!(await canAccessAthlete(user, athleteId))) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const now = new Date().toISOString();
    await updateConsentStatus(consentId, "withdrawn", {
      withdrawnAt: now,
      withdrawnBy: user.email,
    });

    await logAuditEvent({
      actorEmail: user.email,
      actorRole: user.primaryRole,
      action: "consent.withdraw",
      resourceType: "consent",
      resourceId: consentId,
      metadata: { athleteId },
    });

    return NextResponse.json({ success: true, message: "Consent withdrawn" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error withdrawing consent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
