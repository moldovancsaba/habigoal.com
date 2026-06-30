import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_SESSION_CAPABILITY_KEY } from "@/lib/athleteiq-session";
import { createSessionFromBlueprint, listSessions } from "@/services/athleteiq-session.service";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (from && !datePattern.test(from)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["from must use YYYY-MM-DD"] });
    if (to && !datePattern.test(to)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["to must use YYYY-MM-DD"] });
    if (from && to && from > to) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["from must be before or equal to to"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const sessions = await listSessions({ athleteId, from, to });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_SESSION_CAPABILITY_KEY, event: "athleteiq.sessions.listed", correlationId, athleteId, count: sessions.length, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ sessions, count: sessions.length, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

// Create a draft session from a reusable blueprint (TRN-002, #83) — the runner UI
// posts here, then transitions the session active and debriefs it through the
// existing lifecycle routes.
export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as { athleteId?: unknown; localDate?: unknown; blueprintKey?: unknown } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    const localDate = typeof body?.localDate === "string" ? body.localDate.trim() : "";
    const blueprintKey = typeof body?.blueprintKey === "string" ? body.blueprintKey.trim() : "";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!datePattern.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["localDate must use YYYY-MM-DD"] });
    if (!blueprintKey) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["blueprintKey is required"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const result = await createSessionFromBlueprint({ athleteId, localDate, blueprintKey });
    if (!result.session) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });

    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_SESSION_CAPABILITY_KEY, event: "athleteiq.session.created_from_blueprint", correlationId, athleteId, blueprintKey, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ session: result.session, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
