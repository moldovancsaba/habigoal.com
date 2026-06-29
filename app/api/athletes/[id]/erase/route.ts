import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { hasCapability } from "@/lib/permissions";
import { eraseAthleteData } from "@/services/privacy.service";
import { logAuditEvent } from "@/lib/audit";
import { jsonError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !hasCapability(user.roles, "privacy:erase")) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const { id } = await params;
  if (!(await canAccessAthlete(user, id))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  // Irreversible GDPR erasure: require an explicit confirm keyword in the body so
  // it can never be triggered accidentally (#205).
  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "ERASE") {
    return jsonError('Erasure requires { "confirm": "ERASE" }', 400, "CONFIRMATION_REQUIRED");
  }

  const result = await eraseAthleteData(id);
  await logAuditEvent({
    actorEmail: user.email,
    actorRole: user.primaryRole,
    action: "athlete.erase",
    resourceType: "athlete",
    resourceId: id,
    metadata: { erased: result.erased, counts: result.counts, mediaObjectsDeleted: result.mediaObjectsDeleted },
  });

  return NextResponse.json({ ok: true, ...result });
}
