import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_REFLECTION_CAPABILITY_KEY } from "@/lib/athleteiq-reflection";
import { getMemoryHandoff } from "@/services/athleteiq-reflection.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const localDate = searchParams.get("date")?.trim();
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["date must use YYYY-MM-DD"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const handoff = await getMemoryHandoff({ athleteId, fromDate: localDate });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_REFLECTION_CAPABILITY_KEY, event: "athleteiq.memory_handoff.viewed", correlationId, athleteId, fromDate: localDate, tagCount: handoff.tags.length, privacyClassification: "derived_reflection_tags", latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ handoff, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
