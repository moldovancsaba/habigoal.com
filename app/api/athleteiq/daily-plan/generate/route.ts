import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_PLAN_CAPABILITY_KEY } from "@/lib/athleteiq-daily-plan";
import { generateDailyPlan } from "@/services/athleteiq-daily-plan.service";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as { athleteId?: string; timezone?: string; localDate?: string } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const plan = await generateDailyPlan({ athleteId, timezone: body?.timezone, localDate: body?.localDate });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_PLAN_CAPABILITY_KEY, event: "athleteiq.daily_plan.generated", correlationId, athleteId, taskCount: plan.tasks.length, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({ plan, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
