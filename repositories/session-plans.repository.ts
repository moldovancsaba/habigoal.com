import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { SessionPlanDay, SessionPlanRecord, SessionPlanVariant } from "@/types/session-plan";

const collectionName = "session_plans";

function normalizeDay(day: Partial<SessionPlanDay> | null | undefined): SessionPlanDay | null {
  if (!day?.isoDate) return null;

  return {
    isoDate: day.isoDate,
    variant: day.variant === "recovery" || day.variant === "controlled" ? day.variant : "standard",
    focus: typeof day.focus === "string" ? day.focus : "",
    loadTarget: typeof day.loadTarget === "string" ? day.loadTarget : "",
    coachNote: typeof day.coachNote === "string" ? day.coachNote : "",
    athleteNames: Array.isArray(day.athleteNames) ? day.athleteNames.filter((value): value is string => typeof value === "string") : []
  };
}

function normalizeRecord(raw: Record<string, unknown>): SessionPlanRecord {
  const json = toJsonId(raw);
  return {
    _id: typeof json._id === "string" ? json._id : undefined,
    weekStart: typeof json.weekStart === "string" ? json.weekStart : "",
    scope: typeof json.scope === "string" ? json.scope : "all",
    variant: json.variant === "recovery" || json.variant === "controlled" ? json.variant : "standard",
    days: Array.isArray(json.days)
      ? json.days.map((day) => normalizeDay(day as Partial<SessionPlanDay>)).filter((day): day is SessionPlanDay => Boolean(day))
      : [],
    summary: {
      totalAthletes: typeof (json.summary as Record<string, unknown> | undefined)?.totalAthletes === "number" ? (json.summary as Record<string, number>).totalAthletes : 0,
      supportAthletes: typeof (json.summary as Record<string, unknown> | undefined)?.supportAthletes === "number" ? (json.summary as Record<string, number>).supportAthletes : 0,
      missingCheckIns: typeof (json.summary as Record<string, unknown> | undefined)?.missingCheckIns === "number" ? (json.summary as Record<string, number>).missingCheckIns : 0,
      averageLoad: typeof (json.summary as Record<string, unknown> | undefined)?.averageLoad === "number" ? (json.summary as Record<string, number>).averageLoad : 0
    },
    actorName: typeof json.actorName === "string" ? json.actorName : "",
    actorEmail: typeof json.actorEmail === "string" ? json.actorEmail : "",
    createdAt: typeof json.createdAt === "string" ? json.createdAt : "",
    updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : ""
  };
}

export async function getSessionPlan(weekStart: string, scope: string): Promise<SessionPlanRecord | null> {
  const db = await getDatabase();
  const plan = await db.collection(collectionName).findOne({ weekStart, scope });
  return plan ? normalizeRecord(plan as Record<string, unknown>) : null;
}

export async function upsertSessionPlan(input: {
  weekStart: string;
  scope: string;
  variant: SessionPlanVariant;
  days: SessionPlanDay[];
  summary: SessionPlanRecord["summary"];
  actorName: string;
  actorEmail: string;
}): Promise<SessionPlanRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.collection(collectionName).updateOne(
    { weekStart: input.weekStart, scope: input.scope },
    {
      $set: {
        variant: input.variant,
        days: input.days,
        summary: input.summary,
        actorName: input.actorName,
        actorEmail: input.actorEmail,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  const saved = await db.collection(collectionName).findOne({ weekStart: input.weekStart, scope: input.scope });
  return normalizeRecord(saved as Record<string, unknown>);
}
