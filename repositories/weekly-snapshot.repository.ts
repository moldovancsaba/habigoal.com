import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { WeeklyAthleteSnapshot } from "@/lib/weekly-snapshot";

// Persistence for versioned weekly snapshots (#86). One snapshot per
// (athleteId, weekStart); regenerating overwrites in place but keeps the same
// identity so links stay stable. Stored values are reproducible because each
// record carries the scorer/report/insight/snapshot versions that produced it.
const collectionName = "weekly_snapshots";

export type StoredWeeklySnapshot = WeeklyAthleteSnapshot & { _id?: string };

function normalize(raw: Record<string, unknown>): StoredWeeklySnapshot {
  const json = toJsonId(raw) as Record<string, unknown> & { _id?: string };
  return json as unknown as StoredWeeklySnapshot;
}

export async function upsertWeeklySnapshot(snapshot: WeeklyAthleteSnapshot): Promise<StoredWeeklySnapshot> {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { athleteId: snapshot.athleteId, weekStart: snapshot.weekStart },
    { $set: snapshot },
    { upsert: true }
  );
  const saved = await db
    .collection(collectionName)
    .findOne({ athleteId: snapshot.athleteId, weekStart: snapshot.weekStart });
  return normalize(saved as Record<string, unknown>);
}

export async function getWeeklySnapshot(athleteId: string, weekStart: string): Promise<StoredWeeklySnapshot | null> {
  const db = await getDatabase();
  const found = await db.collection(collectionName).findOne({ athleteId, weekStart });
  return found ? normalize(found as Record<string, unknown>) : null;
}

export async function listWeeklySnapshots(athleteId: string): Promise<StoredWeeklySnapshot[]> {
  const db = await getDatabase();
  const rows = await db
    .collection(collectionName)
    .find({ athleteId })
    .sort({ weekStart: -1 })
    .toArray();
  return rows.map((row) => normalize(row as Record<string, unknown>));
}
