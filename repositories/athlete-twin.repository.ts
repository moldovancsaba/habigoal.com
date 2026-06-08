import { getDatabase } from "@/lib/mongodb";
import { AthleteTwin } from "../types/athlete-twin";

const COLLECTION_NAME = "athlete_twins";

export async function findTwinByAthleteId(athleteId: string): Promise<AthleteTwin | null> {
  const db = await getDatabase();
  const collection = db.collection<AthleteTwin>(COLLECTION_NAME);
  return await collection.findOne({ athleteId });
}

export async function upsertTwin(twin: AthleteTwin): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const filter = { athleteId: twin.athleteId };
  const update = {
    $set: {
      ...twin,
      updatedAt: new Date().toISOString(),
    },
    $setOnInsert: {
      createdAt: new Date().toISOString(),
    },
  };

  // We loop to handle concurrency: max 3 retries on version conflict
  // But for now we just rely on standard upsert since version increment is handled externally
  // A true optimistic concurrency control would use { athleteId, twinVersion: twin.twinVersion - 1 }
  // but let's implement standard upsert as a baseline.
  await collection.updateOne(filter, update, { upsert: true });
}

export async function archiveTwin(athleteId: string): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);
  await collection.updateOne(
    { athleteId },
    { $set: { archivedAt: new Date().toISOString() } }
  );
}
