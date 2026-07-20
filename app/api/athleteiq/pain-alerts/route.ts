import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_PAIN_SAFETY_CAPABILITY_KEY } from "@/lib/athleteiq-pain-safety";
import { listPainAlerts } from "@/services/athleteiq-pain-safety.service";

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
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const alerts = await listPainAlerts({ athleteId, timezone, localDate });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_PAIN_SAFETY_CAPABILITY_KEY, event: "athleteiq.pain_alerts.listed", correlationId, athleteId, count: alerts.length, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({ alerts, count: alerts.length, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
