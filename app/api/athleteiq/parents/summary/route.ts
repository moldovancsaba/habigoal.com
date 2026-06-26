import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY } from "@/lib/athleteiq-stakeholder";
import { getParentSummaryProjection } from "@/services/athleteiq-stakeholder.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const localDate = searchParams.get("date")?.trim() || new Date().toISOString().slice(0, 10);
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["date must use YYYY-MM-DD"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const projection = await getParentSummaryProjection({ athleteId, localDate, timezone });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY, event: "athleteiq.parent.summary_viewed", correlationId, athleteId, privacyClassification: "parent_projection_redacted", latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ projection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
