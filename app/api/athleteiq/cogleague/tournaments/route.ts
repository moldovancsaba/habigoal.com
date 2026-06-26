import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_COGNITIVE_CAPABILITY_KEY, validateCogLeagueBoundary } from "@/lib/athleteiq-cognitive";
import { getCogLeagueFutureBoundary } from "@/services/athleteiq-cognitive.service";

export async function GET() {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const boundary = await getCogLeagueFutureBoundary();
    const errors = validateCogLeagueBoundary(boundary);
    if (errors.length) return athleteIqJsonError("REGISTRY_INVALID", 500, correlationId, { details: errors });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_COGNITIVE_CAPABILITY_KEY, event: "athleteiq.cogleague_future.boundary_viewed", correlationId, enabled: boundary.enabled, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ boundary, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    if ((error as Error).message === "COGNITIVE_TIMEOUT") return athleteIqJsonError("TIMEOUT", 504, correlationId, { retryable: true });
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
