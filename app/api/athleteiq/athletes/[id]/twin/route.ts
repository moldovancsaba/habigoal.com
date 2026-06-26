import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_TWIN_PROJECTION_CAPABILITY_KEY, isAthleteTwinProjectionView } from "@/lib/athleteiq-twin-projection";
import { buildAthleteTwinProjectionForView } from "@/services/athleteiq-twin-projection.service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id: athleteId } = await context.params;
    const { searchParams } = new URL(request.url);
    const viewParam = searchParams.get("view");
    const view = isAthleteTwinProjectionView(viewParam) ? viewParam : "athlete";
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const localDate = searchParams.get("localDate")?.trim();

    if (localDate && !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["localDate must use YYYY-MM-DD"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    if (!canUseTwinView(user.primaryRole, view)) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const projection = await buildAthleteTwinProjectionForView({ athleteId, view, viewerRole: user.primaryRole, timezone, localDate });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_TWIN_PROJECTION_CAPABILITY_KEY, event: "athleteiq.twin_projection.viewed", correlationId, athleteId, view, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({ projection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function canUseTwinView(role: string, view: string) {
  if (view === "athlete") return true;
  if (view === "parent") return ["admin", "trainer", "performance_coach", "parent"].includes(role);
  if (view === "coach" || view === "team") return ["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"].includes(role);
  return false;
}
