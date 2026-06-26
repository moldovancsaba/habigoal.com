import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AthleteIqCheckInMode } from "@/types/athleteiq-check-in";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";

const collectionName = "athleteiq_daily_iq_snapshots";
type DailyIqDocument = Omit<DailyIqSnapshot, "id">;

function normalizeDailyIqSnapshot(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as DailyIqSnapshot;
}

export async function insertDailyIqSnapshot(snapshot: DailyIqSnapshot) {
  const db = await getDatabase();
  const collection = db.collection<DailyIqDocument>(collectionName);
  const result = await collection.insertOne(snapshot);
  return { ...snapshot, id: result.insertedId.toString() };
}

export async function upsertDailyIqSnapshot(snapshot: DailyIqSnapshot) {
  const db = await getDatabase();
  const collection = db.collection<DailyIqDocument>(collectionName);
  const result = await collection.findOneAndUpdate(
    {
      athleteId: snapshot.athleteId,
      localDate: snapshot.localDate,
      mode: snapshot.mode
    },
    { $set: snapshot },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeDailyIqSnapshot(result as unknown as Record<string, unknown>);
}

export async function getLatestDailyIqSnapshot(input: {
  athleteId: string;
  localDate: string;
  mode?: AthleteIqCheckInMode;
}) {
  const db = await getDatabase();
  const collection = db.collection<DailyIqDocument>(collectionName);
  const record = await collection
    .find({
      athleteId: input.athleteId,
      localDate: input.localDate,
      ...(input.mode ? { mode: input.mode } : {})
    })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();

  return record ? normalizeDailyIqSnapshot(record as unknown as Record<string, unknown>) : null;
}

export async function listLatestDailyIqSnapshots(input: {
  athleteId: string;
  from: string;
  to: string;
  mode?: AthleteIqCheckInMode;
}) {
  const db = await getDatabase();
  const collection = db.collection<DailyIqDocument>(collectionName);
  const records = await collection
    .find({
      athleteId: input.athleteId,
      localDate: { $gte: input.from, $lte: input.to },
      ...(input.mode ? { mode: input.mode } : {})
    })
    .sort({ localDate: 1, createdAt: -1 })
    .toArray();

  const latestByDate = new Map<string, DailyIqSnapshot>();
  for (const record of records) {
    const snapshot = normalizeDailyIqSnapshot(record as unknown as Record<string, unknown>);
    if (!latestByDate.has(snapshot.localDate)) latestByDate.set(snapshot.localDate, snapshot);
  }

  return Array.from(latestByDate.values());
}
