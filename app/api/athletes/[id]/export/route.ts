import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { hasCapability } from "@/lib/permissions";
import { exportAthleteData } from "@/services/privacy.service";
import { logAuditEvent } from "@/lib/audit";
import { jsonError } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !hasCapability(user.roles, "privacy:export")) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const { id } = await params;
  if (!(await canAccessAthlete(user, id))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const bundle = await exportAthleteData(id);
  await logAuditEvent({
    actorEmail: user.email,
    actorRole: user.primaryRole,
    action: "athlete.export",
    resourceType: "athlete",
    resourceId: id,
  });

  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition": `attachment; filename="athlete-${id}-export.json"`,
    },
  });
}
