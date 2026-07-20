import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { SessionCategory, SessionPlan, SessionRpeResult } from "@/types/training-plan";

const COLLECTION = "training_sessions";
const RPE_COLLECTION = "session_rpe_results";

function normalizeSession(raw: Record<string, unknown>): SessionPlan {
  const json = toJsonId(raw);
  return {
    _id: typeof json._id === "string" ? json._id : undefined,
    sessionId: typeof json.sessionId === "string" ? json.sessionId : crypto.randomUUID(),
    organisationId: typeof json.organisationId === "string" ? json.organisationId : "default",
    coachId: typeof json.coachId === "string" ? json.coachId : "",
    title: typeof json.title === "string" ? json.title : "",
    description: typeof json.description === "string" ? json.description : "",
    category: (["strength", "tactical", "endurance", "speed", "recovery", "match"] as SessionCategory[]).includes(json.category as SessionCategory)
      ? (json.category as SessionCategory)
      : "tactical",
    date: typeof json.date === "string" ? json.date : "",
    durationMinutes: typeof json.durationMinutes === "number" ? json.durationMinutes : 60,
    assignedAthleteIds: Array.isArray(json.assignedAthleteIds) ? json.assignedAthleteIds.filter((v): v is string => typeof v === "string") : [],
    assignedTeamId: typeof json.assignedTeamId === "string" ? json.assignedTeamId : undefined,
    plannedLoadPoints: typeof json.plannedLoadPoints === "number" ? json.plannedLoadPoints : 0,
    createdAt: typeof json.createdAt === "string" ? json.createdAt : "",
    updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : "",
  };
}

export async function listTrainingSessions(filters?: { teamId?: string; athleteId?: string; from?: string; to?: string }): Promise<SessionPlan[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {};
  if (filters?.teamId) query.assignedTeamId = filters.teamId;
  if (filters?.athleteId) query.assignedAthleteIds = filters.athleteId;
  if (filters?.from || filters?.to) {
    query.date = {};
    if (filters.from) (query.date as Record<string, string>).$gte = filters.from;
    if (filters.to) (query.date as Record<string, string>).$lte = filters.to;
  }
  const rows = await db.collection(COLLECTION).find(query).sort({ date: 1 }).toArray();
  return rows.map((r) => normalizeSession(r as Record<string, unknown>));
}

export async function getTrainingSessionBySessionId(sessionId: string): Promise<SessionPlan | null> {
  const db = await getDatabase();
  const row = await db.collection(COLLECTION).findOne({ sessionId });
  return row ? normalizeSession(row as Record<string, unknown>) : null;
}

export async function upsertTrainingSession(session: Omit<SessionPlan, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): Promise<SessionPlan> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.collection(COLLECTION).updateOne(
    { sessionId: session.sessionId },
    {
      $set: { ...session, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const saved = await db.collection(COLLECTION).findOne({ sessionId: session.sessionId });
  return normalizeSession(saved as Record<string, unknown>);
}

export async function recordSessionRpe(result: SessionRpeResult): Promise<void> {
  const db = await getDatabase();
  await db.collection(RPE_COLLECTION).updateOne(
    { sessionId: result.sessionId, athleteId: result.athleteId },
    { $set: { ...result, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function getLoadComparison(sessionId: string): Promise<{ planned: number; completed: number; delta: number } | null> {
  const db = await getDatabase();
  const session = await db.collection(COLLECTION).findOne({ sessionId });
  if (!session) return null;
  const rpeRows = await db.collection(RPE_COLLECTION).find({ sessionId }).toArray();
  const completed = rpeRows.reduce((sum, r) => sum + (typeof r.completedLoadPoints === "number" ? r.completedLoadPoints : 0), 0);
  const planned = typeof session.plannedLoadPoints === "number" ? session.plannedLoadPoints : 0;
  return { planned, completed, delta: completed - planned };
}
