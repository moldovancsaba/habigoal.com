import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, isMentalEdgeRoutineId } from "@/lib/athleteiq-mental-edge";
import { completeMentalEdgeRoutine } from "@/services/athleteiq-mental-edge.service";

export async function POST(request: Request, context: { params: Promise<{ routineId: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { routineId } = await context.params;
    const body = (await readJson(request)) as { athleteId?: string; localDate?: string; timezone?: string } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";

    if (!isMentalEdgeRoutineId(routineId)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["unknown routineId"] });
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, event: "athleteiq.mental_edge_routine.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const completion = await completeMentalEdgeRoutine({
      athleteId,
      routineId,
      localDate: body?.localDate,
      timezone: body?.timezone,
      actorEmail: user.email
    });

    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, event: "athleteiq.mental_edge.routine_completed", correlationId, athleteId, routineId, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({
      completion,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
