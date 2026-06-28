import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_COGNITIVE_CAPABILITY_KEY, validateCognitiveLiteRequest } from "@/lib/athleteiq-cognitive";
import { getCognitiveLiteResults, submitCognitiveLiteResult } from "@/services/athleteiq-cognitive.service";

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

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    const requestErrors = validateCognitiveLiteRequest({ athleteId });
    if (requestErrors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: requestErrors });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const localDate = typeof body?.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.localDate)
      ? body.localDate
      : new Date().toISOString().slice(0, 10);

    const { errors, journey } = await submitCognitiveLiteResult({
      athleteId,
      trait: body?.trait,
      score: body?.score,
      localDate,
      actorEmail: user.email
    });
    if (errors.length || !journey) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });

    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_COGNITIVE_CAPABILITY_KEY, event: "athleteiq.cognitive_lite.entry_submitted", correlationId, athleteId, enteredTraitCount: journey.enteredTraitCount, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ journey, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    if ((error as Error).message === "COGNITIVE_TIMEOUT") return athleteIqJsonError("TIMEOUT", 504, correlationId, { retryable: true });
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
