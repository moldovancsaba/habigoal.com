import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_COGNITIVE_CAPABILITY_KEY, validateCognitiveLiteRequest } from "@/lib/athleteiq-cognitive";
import { getCognitiveLiteResults } from "@/services/athleteiq-cognitive.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim() || "";
    const errors = validateCognitiveLiteRequest({ athleteId });
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const journey = await getCognitiveLiteResults({ athleteId });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_COGNITIVE_CAPABILITY_KEY, event: "athleteiq.cognitive_lite.results_viewed", correlationId, athleteId, completedTraitCount: journey.completedTraitCount, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ journey, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    if ((error as Error).message === "COGNITIVE_TIMEOUT") return athleteIqJsonError("TIMEOUT", 504, correlationId, { retryable: true });
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
