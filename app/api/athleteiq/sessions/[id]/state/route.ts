import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_SESSION_CAPABILITY_KEY, isAthleteIqSessionState } from "@/lib/athleteiq-session";
import { getSession, transitionSessionState } from "@/services/athleteiq-session.service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const body = (await readJson(request)) as { state?: string; reason?: string } | null;
    if (!isAthleteIqSessionState(body?.state)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["state must be draft, active, paused, completed, or abandoned"] });
    const existing = await getSession(id);
    if (!existing) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["session not found"] });
    if (!(await canAccessAthlete(user, existing.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    const result = await transitionSessionState({ sessionId: id, state: body.state, actorEmail: user.email, reason: typeof body?.reason === "string" ? body.reason.trim() : undefined });
    if (!result.session) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_SESSION_CAPABILITY_KEY, event: "athleteiq.session.state_updated", correlationId, sessionId: id, state: body.state, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ session: result.session, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
