import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_PLAN_CAPABILITY_KEY } from "@/lib/athleteiq-daily-plan";
import { updateDailyPlanTaskState } from "@/services/athleteiq-daily-plan.service";
import type { DailyTaskCompletionState } from "@/types/athleteiq-daily-plan";

function parseCompletionState(value: unknown): DailyTaskCompletionState | null {
  return value === "open" || value === "completed" || value === "dismissed" ? value : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const body = (await readJson(request)) as { athleteId?: string; localDate?: string; completionState?: string } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    const localDate = typeof body?.localDate === "string" ? body.localDate.trim() : "";
    const completionState = parseCompletionState(body?.completionState);
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!localDate) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["localDate is required"] });
    if (!completionState) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["completionState must be open, completed, or dismissed"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const plan = await updateDailyPlanTaskState({ athleteId, localDate, taskId: id, completionState, actorEmail: user.email });
    if (!plan) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["daily plan task not found"] });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_PLAN_CAPABILITY_KEY, event: "athleteiq.daily_plan.task_updated", correlationId, athleteId, taskId: id, completionState, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({ plan, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
