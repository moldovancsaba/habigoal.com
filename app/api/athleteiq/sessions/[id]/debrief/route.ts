import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_SESSION_CAPABILITY_KEY } from "@/lib/athleteiq-session";
import { debriefSession, getSession } from "@/services/athleteiq-session.service";

type DebriefBody = {
  rpe?: unknown;
  completionPct?: unknown;
  painAfter?: unknown;
  moodAfter?: unknown;
  notes?: unknown;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const body = (await readJson(request)) as DebriefBody | null;
    const validationErrors = validateDebriefBody(body);
    if (validationErrors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: validationErrors });

    const existing = await getSession(id);
    if (!existing) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["session not found"] });
    if (!(await canAccessAthlete(user, existing.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const result = await debriefSession({
      sessionId: id,
      actorEmail: user.email,
      rpe: body!.rpe as number,
      completionPct: body!.completionPct as number,
      painAfter: body!.painAfter as number,
      moodAfter: body!.moodAfter as number,
      notes: typeof body?.notes === "string" ? body.notes.trim() : undefined
    });
    if (!result.session) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });

    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_SESSION_CAPABILITY_KEY, event: "athleteiq.session.completed", correlationId, sessionId: id, athleteId: result.session.athleteId, latencyMs: Date.now() - startedAt }));
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_SESSION_CAPABILITY_KEY, event: "athleteiq.score.recalculate_requested", correlationId, athleteId: result.session.athleteId, source: "session_debrief" }));
    return NextResponse.json({ session: result.session, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function validateDebriefBody(body: DebriefBody | null) {
  const errors: string[] = [];
  if (!isNumberInRange(body?.rpe, 1, 10)) errors.push("rpe must be 1-10");
  if (!isNumberInRange(body?.completionPct, 0, 100)) errors.push("completionPct must be 0-100");
  if (!isNumberInRange(body?.painAfter, 1, 10)) errors.push("painAfter must be 1-10");
  if (!isNumberInRange(body?.moodAfter, 1, 10)) errors.push("moodAfter must be 1-10");
  if (body?.notes !== undefined && typeof body.notes !== "string") errors.push("notes must be a string when provided");
  return errors;
}

function isNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
