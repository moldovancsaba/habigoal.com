import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, getAthleteIqCheckInSchema, isAthleteIqCheckInMode } from "@/lib/athleteiq-check-in";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId")?.trim();
  const modeParam = searchParams.get("mode");
  const mode = isAthleteIqCheckInMode(modeParam) ? modeParam : "lifestyle";

  if (athleteId && !(await canAccessAthlete(user, athleteId))) {
    console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, event: "athleteiq.checkin.authorization_denied", correlationId }));
    return athleteIqJsonError("FORBIDDEN", 403, correlationId);
  }

  return NextResponse.json({
    ...getAthleteIqCheckInSchema(mode),
    correlationId,
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt
  });
}
