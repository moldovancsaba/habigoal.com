import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { DailyPlan, DailyTaskCompletionState } from "@/types/athleteiq-daily-plan";

const collectionName = "athleteiq_daily_plans";
type DailyPlanDocument = Omit<DailyPlan, "id">;

function normalizeDailyPlan(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as DailyPlan;
}

export async function getDailyPlanByDate(athleteId: string, localDate: string) {
  const db = await getDatabase();
  const collection = db.collection<DailyPlanDocument>(collectionName);
  const record = await collection.findOne({ athleteId, localDate });
  return record ? normalizeDailyPlan(record as unknown as Record<string, unknown>) : null;
}

export async function upsertDailyPlan(plan: DailyPlan) {
  const db = await getDatabase();
  const collection = db.collection<DailyPlanDocument>(collectionName);
  const existing = await collection.findOne({ athleteId: plan.athleteId, localDate: plan.localDate });
  const existingAuditLength = existing?.auditHistory?.length ?? 0;
  const auditHistory = plan.auditHistory.length > existingAuditLength ? plan.auditHistory : [...(existing?.auditHistory ?? []), `generated:${plan.generatedAt}`];
  const result = await collection.findOneAndUpdate(
    { athleteId: plan.athleteId, localDate: plan.localDate },
    {
      $set: {
        timezone: plan.timezone,
        status: plan.status,
        tasks: plan.tasks,
        recommendation: plan.recommendation,
        dataUsed: plan.dataUsed,
        missingData: plan.missingData,
        generatedAt: plan.generatedAt,
        updatedAt: plan.updatedAt,
        version: plan.version,
        auditHistory
      }
    },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeDailyPlan(result as unknown as Record<string, unknown>);
}

export async function updateDailyPlanTask(input: {
  athleteId: string;
  localDate: string;
  taskId: string;
  completionState: DailyTaskCompletionState;
  actorEmail: string;
}) {
  const existing = await getDailyPlanByDate(input.athleteId, input.localDate);
  if (!existing) return null;
  const now = new Date().toISOString();
  const tasks = existing.tasks.map((task) => task.id === input.taskId ? { ...task, completionState: input.completionState } : task);
  if (!tasks.some((task) => task.id === input.taskId)) return null;

  return upsertDailyPlan({
    ...existing,
    tasks,
    updatedAt: now,
    auditHistory: [...existing.auditHistory, `task:${input.taskId}:${input.completionState}:${now}:${input.actorEmail}`]
  });
}
