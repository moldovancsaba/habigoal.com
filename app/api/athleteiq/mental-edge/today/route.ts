import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY } from "@/lib/athleteiq-mental-edge";
import { getMentalEdgeToday } from "@/services/athleteiq-mental-edge.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const localDate = searchParams.get("localDate")?.trim();

    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, event: "athleteiq.mental_edge.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const snapshot = await getMentalEdgeToday({ athleteId, timezone, localDate });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, event: "athleteiq.mental_edge.today_viewed", correlationId, athleteId, riskLevel: snapshot.riskLevel, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({
      snapshot,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
