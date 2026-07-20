import { NextResponse } from "next/server";
import { readJson, requireRole, jsonError } from "@/lib/api";
import { createAssessmentFromPayload } from "@/services/assessment.service";
import { logAuditEvent } from "@/lib/audit";
import { getAuthUser } from "@/lib/access";

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  const body = (await readJson(request)) as { assessments?: unknown[]; staffOverride?: boolean } | null;
  const items = Array.isArray(body?.assessments) ? body.assessments : [];
  if (items.length === 0) {
    return jsonError("assessments array required", 400, "VALIDATION_ERROR");
  }

  const user = await getAuthUser({ productSurface: "athlete-iq" });
  const results: unknown[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const created = await createAssessmentFromPayload(items[i], {
        staffOverride: body?.staffOverride,
        actor: user ? { email: user.email, name: user.name, role: user.primaryRole } : undefined
      });
      results.push(created);
    } catch (error) {
      errors.push({ index: i, error: error instanceof Error ? error.message : "sync failed" });
    }
  }

  if (user) {
    await logAuditEvent({
      actorEmail: user.email,
      actorRole: user.primaryRole,
      action: "checkin.create",
      resourceType: "checkin_sync",
      metadata: { synced: results.length, failed: errors.length },
    });
  }

  return NextResponse.json({ synced: results.length, results, errors });
}
