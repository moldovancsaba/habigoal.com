import { getDatabase } from "@/lib/mongodb";
import { DEFAULT_COACH_THRESHOLDS, type CoachThresholds } from "@/types/coach-thresholds";

const collectionName = "coach_thresholds";

export async function getCoachThresholds(teamId: string): Promise<CoachThresholds> {
  const db = await getDatabase();
  const stored = (await db.collection(collectionName).findOne({ teamId })) as unknown as CoachThresholds | null;
  return {
    teamId,
    greenMin: stored?.greenMin ?? DEFAULT_COACH_THRESHOLDS.greenMin,
    yellowMin: stored?.yellowMin ?? DEFAULT_COACH_THRESHOLDS.yellowMin,
    updatedAt: stored?.updatedAt,
    actorEmail: stored?.actorEmail,
  };
}

export async function upsertCoachThresholds(input: {
  teamId: string;
  greenMin: number;
  yellowMin: number;
  actorEmail: string;
}): Promise<CoachThresholds> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { teamId: input.teamId },
    {
      $set: { greenMin: input.greenMin, yellowMin: input.yellowMin, actorEmail: input.actorEmail, updatedAt: now },
      $setOnInsert: { teamId: input.teamId, createdAt: now },
    },
    { upsert: true }
  );
  return { teamId: input.teamId, greenMin: input.greenMin, yellowMin: input.yellowMin, updatedAt: now, actorEmail: input.actorEmail };
}
