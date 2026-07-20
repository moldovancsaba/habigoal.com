import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_GAMEFLOW_CAPABILITY_KEY, validateGameFlowFutureBoundary, validateGameFlowTimelineRequest } from "@/lib/athleteiq-gameflow";
import { getGameFlowFutureTimeline } from "@/services/athleteiq-gameflow.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id: matchId } = await context.params;
    const errors = validateGameFlowTimelineRequest({ matchId });
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });

    const timeline = await getGameFlowFutureTimeline({ matchId });
    const boundaryErrors = validateGameFlowFutureBoundary(timeline);
    if (boundaryErrors.length) return athleteIqJsonError("REGISTRY_INVALID", 500, correlationId, { details: boundaryErrors });

    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_GAMEFLOW_CAPABILITY_KEY, event: "athleteiq.gameflow_future.timeline_viewed", correlationId, matchId, enabled: timeline.enabled, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ timeline, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
