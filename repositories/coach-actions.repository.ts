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
