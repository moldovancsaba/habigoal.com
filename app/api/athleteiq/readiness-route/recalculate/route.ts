import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_READINESS_ROUTE_CAPABILITY_KEY, validateReadinessRouteRequest } from "@/lib/athleteiq-readiness-route";
import { recalculateReadinessRoute } from "@/services/athleteiq-readiness-route.service";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as { athleteId?: string; localDate?: string; timezone?: string } | null;
    const input = {
      athleteId: typeof body?.athleteId === "string" ? body.athleteId.trim() : "",
      localDate: typeof body?.localDate === "string" ? body.localDate.trim() : undefined,
      timezone: typeof body?.timezone === "string" ? body.timezone.trim() : undefined
    };
    const errors = validateReadinessRouteRequest(input);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    if (!(await canAccessAthlete(user, input.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const snapshot = await recalculateReadinessRoute(input);
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_READINESS_ROUTE_CAPABILITY_KEY, event: "athleteiq.readiness_route.recalculated", correlationId, athleteId: input.athleteId, route: snapshot.route, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ snapshot, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
