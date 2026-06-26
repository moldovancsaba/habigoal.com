import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AthleteIqCheckInMode, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

const collectionName = "athleteiq_checkins";
type AthleteIqCheckInDocument = Omit<AthleteIqCheckInSnapshot, "id">;

function normalizeSnapshot(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as AthleteIqCheckInSnapshot;
}

export async function upsertAthleteIqCheckInSnapshot(snapshot: AthleteIqCheckInSnapshot) {
  const db = await getDatabase();
  const collection = db.collection<AthleteIqCheckInDocument>(collectionName);
  const existing = await collection.findOne({
    athleteId: snapshot.athleteId,
    localDate: snapshot.localDate,
    mode: snapshot.mode
  });

  if (existing) {
    const auditEntry = `updated:${snapshot.updatedAt}`;
    const result = await collection.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          values: snapshot.values,
          missingFields: snapshot.missingFields,
          sourceLabels: snapshot.sourceLabels,
          timezone: snapshot.timezone,
          updatedAt: snapshot.updatedAt,
          idempotencyKey: snapshot.idempotencyKey
        },
        $push: { auditHistory: auditEntry }
      },
      { returnDocument: "after" }
    );
    return normalizeSnapshot(result as unknown as Record<string, unknown>);
  }

  const result = await collection.insertOne(snapshot);
  return { ...snapshot, id: result.insertedId.toString() };
}

export async function getAthleteIqCheckInSnapshot(athleteId: string, localDate: string, mode: AthleteIqCheckInMode) {
  const db = await getDatabase();
  const collection = db.collection<AthleteIqCheckInDocument>(collectionName);
  const record = await collection.findOne({ athleteId, localDate, mode });
  return record ? normalizeSnapshot(record as Record<string, unknown>) : null;
}

export async function listAthleteIqCheckInSnapshots(input: {
  athleteId: string;
  from: string;
  to: string;
  mode?: AthleteIqCheckInMode;
}) {
  const db = await getDatabase();
  const collection = db.collection<AthleteIqCheckInDocument>(collectionName);
  const records = await collection
    .find({
      athleteId: input.athleteId,
      localDate: { $gte: input.from, $lte: input.to },
      ...(input.mode ? { mode: input.mode } : {})
    })
    .sort({ localDate: 1, updatedAt: -1 })
    .toArray();

  const latestByDate = new Map<string, AthleteIqCheckInSnapshot>();
  for (const record of records) {
    const snapshot = normalizeSnapshot(record as unknown as Record<string, unknown>);
    if (!latestByDate.has(snapshot.localDate)) latestByDate.set(snapshot.localDate, snapshot);
  }

  return Array.from(latestByDate.values());
}
