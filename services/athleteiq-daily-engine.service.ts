import { logAuditEvent } from "@/lib/audit";
import { getLocalDateForTimezone, isAthleteIqCheckInMode } from "@/lib/athleteiq-check-in";
import { upsertCoachAction } from "@/repositories/coach-actions.repository";
import { recalculateDailyIq } from "@/services/athleteiq-daily-iq.service";
import { generateDailyPlan } from "@/services/athleteiq-daily-plan.service";
import { getPainGuardrailToday } from "@/services/athleteiq-pain-safety.service";
import { recalculateReadinessRoute } from "@/services/athleteiq-readiness-route.service";
import { rebuildAthleteTwinProjection } from "@/services/athleteiq-twin-projection.service";
import type { DailyEnginePartialFailure, DailyEngineRun, DailyEngineRunInput } from "@/types/athleteiq-daily-engine";
import type { AthleteIqCheckInMode } from "@/types/athleteiq-check-in";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { ReadinessRouteSnapshot } from "@/types/athleteiq-readiness-route";
import type { AthleteTwinProjection } from "@/types/athleteiq-twin-projection";
import type { CoachActionRecord, CoachActionSeverity } from "@/types/coach-action";

export const ATHLETEIQ_DAILY_ENGINE_CAPABILITY_KEY = "AIQ-1270";
export const ATHLETEIQ_DAILY_ENGINE_VERSION = "aiq-daily-engine-1270.1";

export function validateDailyEngineInput(input: Partial<DailyEngineRunInput>) {
  const errors: string[] = [];
  if (!input.athleteId?.trim()) errors.push("athleteId is required");
  if (input.localDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) errors.push("localDate must use YYYY-MM-DD");
  if (input.mode && !isAthleteIqCheckInMode(input.mode)) errors.push("mode must be lifestyle or performance");
  if (!input.sourceEvent) errors.push("sourceEvent is required");
  if (!input.actor?.email) errors.push("actor.email is required");
  return errors;
}

export async function runAthleteIqDailyEngine(input: DailyEngineRunInput): Promise<DailyEngineRun> {
  const validationErrors = validateDailyEngineInput(input);
  if (validationErrors.length) throw new Error(validationErrors.join("; "));

  const timezone = input.timezone?.trim() || "UTC";
  const localDate = input.localDate?.trim() || getLocalDateForTimezone(timezone);
  const mode: AthleteIqCheckInMode = isAthleteIqCheckInMode(input.mode) ? input.mode : "performance";
  const runId = input.idempotencyKey?.trim() || crypto.randomUUID();
  const generatedAt = new Date().toISOString();
  const failures: DailyEnginePartialFailure[] = [];

  let dailyIq: DailyIqSnapshot | null = null;
  let painGuardrail: PainGuardrail | null = null;
  let readinessRoute: ReadinessRouteSnapshot | null = null;
  let dailyPlan: DailyPlan | null = null;
  let twinProjections: AthleteTwinProjection[] = [];
  let coachActions: CoachActionRecord[] = [];

  dailyIq = await runStep("daily_iq", failures, async () => {
    const result = await recalculateDailyIq({ athleteId: input.athleteId, localDate, timezone, mode });
    if (!("snapshot" in result)) throw new Error(result.errors.join("; "));
    return result.snapshot;
  });

  painGuardrail = await runStep("pain_guardrail", failures, () =>
    getPainGuardrailToday({ athleteId: input.athleteId, timezone, localDate })
  );

  readinessRoute = await runStep("readiness_route", failures, () =>
    recalculateReadinessRoute({ athleteId: input.athleteId, timezone, localDate })
  );

  dailyPlan = await runStep("daily_plan", failures, () =>
    generateDailyPlan({ athleteId: input.athleteId, timezone, localDate })
  );

  const projections = await Promise.all([
    runStep("twin_projection_athlete", failures, () => rebuildAthleteTwinProjection({ athleteId: input.athleteId, view: "athlete", viewerRole: "athlete", timezone, localDate })),
    runStep("twin_projection_coach", failures, () => rebuildAthleteTwinProjection({ athleteId: input.athleteId, view: "coach", viewerRole: "trainer", timezone, localDate })),
    runStep("twin_projection_parent", failures, () => rebuildAthleteTwinProjection({ athleteId: input.athleteId, view: "parent", viewerRole: "parent", timezone, localDate })),
    runStep("twin_projection_team", failures, () => rebuildAthleteTwinProjection({ athleteId: input.athleteId, view: "team", viewerRole: "trainer", timezone, localDate }))
  ]);
  twinProjections = projections.filter((projection): projection is AthleteTwinProjection => Boolean(projection));

  coachActions = await runStep("coach_actions", failures, () =>
    upsertDailyEngineCoachActions({ athleteId: input.athleteId, localDate, dailyIq, painGuardrail, readinessRoute, dailyPlan, actor: input.actor })
  ) ?? [];

  await runStep("audit", failures, () =>
    logAuditEvent({
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: "athleteiq.daily_engine.run",
      resourceType: "athleteiq_daily_engine",
      resourceId: input.athleteId,
      metadata: {
        capabilityKey: ATHLETEIQ_DAILY_ENGINE_CAPABILITY_KEY,
        engineVersion: ATHLETEIQ_DAILY_ENGINE_VERSION,
        runId,
        sourceEvent: input.sourceEvent,
        localDate,
        mode,
        partialFailureCount: failures.length,
        dailyIqId: dailyIq?.id,
        readinessRouteId: readinessRoute?.id,
        dailyPlanId: dailyPlan?.id
      }
    })
  );

  return {
    runId,
    athleteId: input.athleteId,
    localDate,
    timezone,
    mode,
    sourceEvent: input.sourceEvent,
    idempotencyKey: input.idempotencyKey,
    dailyIq,
    painGuardrail,
    readinessRoute,
    dailyPlan,
    twinProjections,
    coachActions,
    partialFailures: failures,
    generatedAt
  };
}

async function upsertDailyEngineCoachActions(input: {
  athleteId: string;
  localDate: string;
  dailyIq: DailyIqSnapshot | null;
  painGuardrail: PainGuardrail | null;
  readinessRoute: ReadinessRouteSnapshot | null;
  dailyPlan: DailyPlan | null;
  actor: DailyEngineRunInput["actor"];
}) {
  const actions: CoachActionRecord[] = [];
  const actorName = input.actor.name || input.actor.email;

  if (!input.dailyIq || input.dailyIq.confidence === "insufficient" || input.dailyIq.confidence === "low") {
    actions.push(await upsertCoachAction({
      athleteKey: input.athleteId,
      date: input.localDate,
      recommendationKey: "athleteiq.daily_engine.missing_data",
      status: "open",
      severity: "warning",
      sourceType: "daily-engine",
      sourceId: input.dailyIq?.id,
      detail: `Daily IQ confidence is ${input.dailyIq?.confidence ?? "missing"}. Missing data: ${(input.dailyIq?.missingData ?? ["daily_iq"]).join(", ")}.`,
      actorName,
      actorEmail: input.actor.email
    }));
  }

  if (input.painGuardrail && (input.painGuardrail.state === "monitor" || input.painGuardrail.state === "capped" || input.painGuardrail.state === "coach_review")) {
    const severity: CoachActionSeverity = input.painGuardrail.state === "monitor" ? "warning" : "critical";
    actions.push(await upsertCoachAction({
      athleteKey: input.athleteId,
      date: input.localDate,
      recommendationKey: "athleteiq.pain_safety.review",
      status: "open",
      severity,
      sourceType: "pain-safety",
      sourceId: input.painGuardrail.coachAlertId,
      detail: `Pain guardrail ${input.painGuardrail.state}. Reasons: ${input.painGuardrail.reasonCodes.join(", ") || "pain_guardrail"}.`,
      actorName,
      actorEmail: input.actor.email
    }));
  }

  if (input.readinessRoute && (input.readinessRoute.route === "amber" || input.readinessRoute.route === "red")) {
    actions.push(await upsertCoachAction({
      athleteKey: input.athleteId,
      date: input.localDate,
      recommendationKey: "athleteiq.readiness_route.review",
      status: "open",
      severity: input.readinessRoute.route === "red" ? "critical" : "warning",
      sourceType: "readiness-threshold",
      sourceId: input.readinessRoute.id,
      detail: `Readiness route ${input.readinessRoute.route}. Action: ${input.readinessRoute.action}. Blocked: ${input.readinessRoute.blockedActions.join(", ") || "none"}.`,
      actorName,
      actorEmail: input.actor.email
    }));
  }

  const criticalTaskCount = input.dailyPlan?.tasks.filter((task) => task.priority === "critical" && task.completionState === "open").length ?? 0;
  if (criticalTaskCount > 0) {
    actions.push(await upsertCoachAction({
      athleteKey: input.athleteId,
      date: input.localDate,
      recommendationKey: "athleteiq.daily_plan.critical_tasks",
      status: "open",
      severity: "critical",
      sourceType: "daily-engine",
      sourceId: input.dailyPlan?.id,
      detail: `${criticalTaskCount} critical daily plan task${criticalTaskCount === 1 ? "" : "s"} require trainer review.`,
      actorName,
      actorEmail: input.actor.email
    }));
  }

  return actions;
}

async function runStep<T>(
  step: string,
  failures: DailyEnginePartialFailure[],
  action: () => Promise<T>
) {
  try {
    return await action();
  } catch (error) {
    failures.push({ step, message: (error as Error).message });
    console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_ENGINE_CAPABILITY_KEY, event: "athleteiq.daily_engine.partial_failure", step, message: (error as Error).message }));
    return null;
  }
}
