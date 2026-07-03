import { getDatabase } from "@/lib/mongodb";
import type { CoachActionRecord, CoachActionSeverity, CoachActionStatus } from "@/types/coach-action";

const collectionName = "coach_actions";

export async function listCoachActionsByDate(date: string): Promise<CoachActionRecord[]> {
  const db = await getDatabase();
  return db
    .collection(collectionName)
    .find({ date })
    .sort({ updatedAt: -1 })
    .toArray() as unknown as Promise<CoachActionRecord[]>;
}

export interface CoachActionsQuery {
  date?: string;
  from?: string;
  to?: string;
  statuses?: CoachActionStatus[];
  severity?: CoachActionSeverity;
  sourceType?: CoachActionRecord["sourceType"];
  athleteKey?: string;
}

// Pure mongo-filter builder (GH-525 P0: coach-action filtering + history).
// Exported for unit testing without a database.
export function buildCoachActionsFilter(params: CoachActionsQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (params.date) {
    filter.date = params.date;
  } else if (params.from || params.to) {
    const range: Record<string, string> = {};
    if (params.from) range.$gte = params.from;
    if (params.to) range.$lte = params.to;
    filter.date = range;
  }
  if (params.statuses && params.statuses.length > 0) filter.status = { $in: params.statuses };
  if (params.severity) filter.severity = params.severity;
  if (params.sourceType) filter.sourceType = params.sourceType;
  if (params.athleteKey) filter.athleteKey = params.athleteKey;
  return filter;
}

export async function listCoachActions(params: CoachActionsQuery, limit = 200): Promise<CoachActionRecord[]> {
  const db = await getDatabase();
  return db
    .collection(collectionName)
    .find(buildCoachActionsFilter(params))
    .sort({ updatedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 500))
    .toArray() as unknown as Promise<CoachActionRecord[]>;
}

export type CoachActionKey = { athleteKey: string; date: string; recommendationKey: string };

// Bulk status transition (e.g. acknowledge/resolve many alerts at once).
export async function bulkSetCoachActionStatus(input: {
  keys: CoachActionKey[];
  status: CoachActionStatus;
  actorName: string;
  actorEmail: string;
}): Promise<number> {
  if (input.keys.length === 0) return 0;
  const db = await getDatabase();
  const now = new Date().toISOString();
  const ops = input.keys.map((key) => ({
    updateOne: {
      filter: { athleteKey: key.athleteKey, date: key.date, recommendationKey: key.recommendationKey },
      update: {
        $set: { status: input.status, actorName: input.actorName, actorEmail: input.actorEmail, updatedAt: now },
      },
    },
  }));
  const result = await db.collection(collectionName).bulkWrite(ops);
  return result.modifiedCount ?? 0;
}

export async function upsertCoachAction(input: {
  athleteKey: string;
  date: string;
  recommendationKey: string;
  status: CoachActionStatus;
  severity?: CoachActionSeverity;
  sourceType?: CoachActionRecord["sourceType"];
  sourceId?: string;
  detail?: string;
  actorName: string;
  actorEmail: string;
}): Promise<CoachActionRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.collection(collectionName).updateOne(
    {
      athleteKey: input.athleteKey,
      date: input.date,
      recommendationKey: input.recommendationKey
    },
    {
      $set: {
        status: input.status,
        ...(input.severity ? { severity: input.severity } : {}),
        ...(input.sourceType ? { sourceType: input.sourceType } : {}),
        ...(input.sourceId ? { sourceId: input.sourceId } : {}),
        ...(input.detail ? { detail: input.detail } : {}),
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

  const saved = await db.collection(collectionName).findOne({
    athleteKey: input.athleteKey,
    date: input.date,
    recommendationKey: input.recommendationKey
  });

  return saved as unknown as CoachActionRecord;
}
