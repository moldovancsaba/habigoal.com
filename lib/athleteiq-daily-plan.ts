import { athleteHabitDefinitions, getHabitScoreSummary, normalizeHabitStatuses } from "@/lib/athlete-habits";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan, DailyTask, DailyTaskPriority, SessionRecommendation } from "@/types/athleteiq-daily-plan";
import type { LiteModuleGatewaySummary } from "@/types/athleteiq-lite-modules";
import type { MentalEdgeSnapshot } from "@/types/athleteiq-mental-edge";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { HabitRecord } from "@/types/habit-record";

export const ATHLETEIQ_DAILY_PLAN_CAPABILITY_KEY = "AIQ-1250";
export const ATHLETEIQ_DAILY_PLAN_VERSION = "aiq-daily-plan-1250.1";

export function buildDailyPlan(input: {
  athleteId: string;
  localDate: string;
  timezone: string;
  dailyIq: DailyIqSnapshot | null;
  mentalEdge: MentalEdgeSnapshot | null;
  painGuardrail: PainGuardrail;
  habitRecord: HabitRecord | null;
  liteGatewaySummary?: LiteModuleGatewaySummary | null;
  previousPlan?: DailyPlan | null;
}, now = new Date()): DailyPlan {
  const previousTaskState = new Map((input.previousPlan?.tasks ?? []).map((task) => [task.id, task.completionState]));
  const tasks = buildTasks(input).slice(0, 7).map((task) => ({
    ...task,
    completionState: previousTaskState.get(task.id) ?? task.completionState
  }));
  const timestamp = now.toISOString();

  return {
    athleteId: input.athleteId,
    localDate: input.localDate,
    timezone: input.timezone,
    status: "active",
    tasks,
    recommendation: buildSessionRecommendation(input.dailyIq, input.painGuardrail),
    dataUsed: [
      ...(input.dailyIq ? ["daily_iq"] : []),
      ...(input.mentalEdge ? ["mental_edge"] : []),
      "pain_guardrail",
      ...(input.habitRecord ? ["habit_records"] : []),
      ...(input.liteGatewaySummary ? input.liteGatewaySummary.dataUsed : [])
    ],
    missingData: [
      ...(!input.dailyIq ? ["daily_iq"] : []),
      ...(!input.mentalEdge ? ["mental_edge"] : []),
      ...(!input.habitRecord ? ["habit_records"] : []),
      ...(input.liteGatewaySummary ? input.liteGatewaySummary.missingData : [])
    ],
    liteModuleSummaries: input.liteGatewaySummary?.summaries,
    generatedAt: timestamp,
    updatedAt: timestamp,
    version: ATHLETEIQ_DAILY_PLAN_VERSION,
    auditHistory: [`generated:${timestamp}`]
  };
}

function buildTasks(input: {
  dailyIq: DailyIqSnapshot | null;
  mentalEdge: MentalEdgeSnapshot | null;
  painGuardrail: PainGuardrail;
  habitRecord: HabitRecord | null;
  liteGatewaySummary?: LiteModuleGatewaySummary | null;
}) {
  const tasks: DailyTask[] = [];
  if (input.painGuardrail.state !== "none") {
    tasks.push(task("safety:pain-guardrail", "safety", "athleteiq.dailyPlan.tasks.painGuardrail.title", "athleteiq.dailyPlan.tasks.painGuardrail.description", "critical", input.painGuardrail.reasonCodes, "training"));
  }

  if (!input.dailyIq || input.dailyIq.confidence === "insufficient") {
    tasks.push(task("setup:complete-check-in", "setup", "athleteiq.dailyPlan.tasks.completeCheckIn.title", "athleteiq.dailyPlan.tasks.completeCheckIn.description", "high", ["missing_daily_iq"], "morning"));
  }

  const mentalEdge = input.mentalEdge;
  if (mentalEdge) {
    for (const routine of mentalEdge.routines) {
      if (!routine.completed) {
        tasks.push(task(`mental:${routine.routineId}`, "mental", routine.labelKey, "athleteiq.dailyPlan.tasks.mentalRoutine.description", priorityFromRisk(mentalEdge.riskLevel), [routine.reasonCode], "anytime"));
      }
    }
  }

  const statuses = normalizeHabitStatuses(input.habitRecord?.statuses);
  const habitSummary = getHabitScoreSummary(statuses);
  for (const habit of athleteHabitDefinitions) {
    if (!statuses[habit.key]) {
      tasks.push(task(`habit:${habit.key}`, "habit", `athleteiq.dailyPlan.habits.${habit.key}.title`, "athleteiq.dailyPlan.tasks.habit.description", habitSummary.score < 60 ? "medium" : "low", [`habit_gap:${habit.category}`], "anytime"));
    }
  }

  for (const summary of input.liteGatewaySummary?.summaries ?? []) {
    if (summary.entryCount === 0 && (summary.moduleKey === "recovery_lite" || summary.moduleKey === "fuel_lite")) {
      tasks.push(task(`setup:${summary.moduleKey}`, "setup", `athleteiq.dailyPlan.tasks.${summary.moduleKey}.title`, "athleteiq.dailyPlan.tasks.liteModule.description", "low", summary.planReasonLabels, "anytime"));
    }
  }

  return tasks.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.id.localeCompare(b.id));
}

function buildSessionRecommendation(dailyIq: DailyIqSnapshot | null, painGuardrail: PainGuardrail): SessionRecommendation {
  const rationale = [...painGuardrail.reasonCodes];
  const confidence = dailyIq?.confidence ?? "insufficient";
  if (!dailyIq || dailyIq.confidence === "insufficient" || dailyIq.confidence === "low") {
    rationale.push("low_confidence_daily_iq");
  }

  if (painGuardrail.dailyIqCap !== null || painGuardrail.maxTrainingIntensity === "recovery") {
    return { intensity: "recovery", type: "recovery", durationRange: "15-30", rationale, blockedByPainGuardrail: true, confidence };
  }

  if (!dailyIq) return { intensity: "low", type: "recovery", durationRange: "20-35", rationale, blockedByPainGuardrail: false, confidence };
  const score = dailyIq.dailyIqScore;
  if (score === null || dailyIq.confidence === "low") return { intensity: "low", type: "recovery", durationRange: "20-35", rationale, blockedByPainGuardrail: false, confidence };
  if (score >= 80 && dailyIq.confidence === "high") return { intensity: "high", type: "high_intensity", durationRange: "45-75", rationale: [...rationale, "high_daily_iq"], blockedByPainGuardrail: false, confidence };
  if (score >= 60) return { intensity: "moderate", type: "controlled", durationRange: "35-60", rationale: [...rationale, "moderate_daily_iq"], blockedByPainGuardrail: false, confidence };
  return { intensity: "low", type: "recovery", durationRange: "20-40", rationale: [...rationale, "low_daily_iq"], blockedByPainGuardrail: false, confidence };
}

function task(id: DailyTask["id"], category: DailyTask["category"], titleKey: string, descriptionKey: string, priority: DailyTaskPriority, sourceReasonCodes: string[], dueWindow: DailyTask["dueWindow"]): DailyTask {
  return { id, category, titleKey, descriptionKey, priority, sourceReasonCodes, dueWindow, completionState: "open" };
}

function priorityFromRisk(riskLevel: MentalEdgeSnapshot["riskLevel"]): DailyTaskPriority {
  if (riskLevel === "urgent" || riskLevel === "concern") return "high";
  if (riskLevel === "watch") return "medium";
  return "low";
}

function priorityRank(priority: DailyTaskPriority) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}
