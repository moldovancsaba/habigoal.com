import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_SESSION_CAPABILITY_KEY } from "@/lib/athleteiq-session";
import { createSessionFromPlan } from "@/services/athleteiq-session.service";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as { athleteId?: string; localDate?: string; timezone?: string } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    const localDate = typeof body?.localDate === "string" ? body.localDate.trim() : "";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["localDate must use YYYY-MM-DD"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const result = await createSessionFromPlan({ athleteId, localDate, timezone: body?.timezone });
    if (!result.session) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_SESSION_CAPABILITY_KEY, event: "athleteiq.session.created_from_plan", correlationId, athleteId, sessionId: result.session.sessionId, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ session: result.session, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
