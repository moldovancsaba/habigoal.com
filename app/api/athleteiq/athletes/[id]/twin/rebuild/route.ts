import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_TWIN_PROJECTION_CAPABILITY_KEY, isAthleteTwinProjectionView } from "@/lib/athleteiq-twin-projection";
import { rebuildAthleteTwinProjection } from "@/services/athleteiq-twin-projection.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id: athleteId } = await context.params;
    const body = (await readJson(request)) as { view?: string; timezone?: string; localDate?: string } | null;
    const view = isAthleteTwinProjectionView(body?.view) ? body.view : "coach";
    if (body?.localDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["localDate must use YYYY-MM-DD"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    if (!["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"].includes(user.primaryRole)) {
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const projection = await rebuildAthleteTwinProjection({
      athleteId,
      view,
      viewerRole: user.primaryRole,
      timezone: body?.timezone,
      localDate: body?.localDate
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_TWIN_PROJECTION_CAPABILITY_KEY, event: "athleteiq.twin_projection.rebuilt", correlationId, athleteId, view, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({ projection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
