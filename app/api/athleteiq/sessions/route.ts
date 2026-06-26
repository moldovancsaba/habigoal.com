import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_SESSION_CAPABILITY_KEY } from "@/lib/athleteiq-session";
import { listSessions } from "@/services/athleteiq-session.service";

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
