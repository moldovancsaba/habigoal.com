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
