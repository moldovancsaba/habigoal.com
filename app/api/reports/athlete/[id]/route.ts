import { NextResponse } from "next/server";
import { reportingService } from "@/services/reporting.service";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { createEmptyTwin } from "@/lib/twin-updater";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { hasCapability } from "@/lib/permissions";
import { jsonError } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !hasCapability(user.roles, "report:read")) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const { id } = await params;
    if (!(await canAccessAthlete(user, id))) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;

    const twin = (await findTwinByAthleteId(id)) ?? createEmptyTwin(id, "default");
    const report = await reportingService.generateAthleteReport(id, twin, { from, to });

    await logAuditEvent({
      actorEmail: user.email,
      actorRole: user.primaryRole,
      action: "report.generate",
      resourceType: "athlete",
      resourceId: id,
    });

    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
