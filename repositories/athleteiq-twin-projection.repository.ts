import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AthleteTwinProjection, AthleteTwinProjectionView } from "@/types/athleteiq-twin-projection";

const collectionName = "athleteiq_twin_projections";
type AthleteTwinProjectionDocument = Omit<AthleteTwinProjection, "id">;

function normalizeProjection(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as AthleteTwinProjection;
}

export async function getTwinProjectionSnapshot(input: {
  athleteId: string;
  view: AthleteTwinProjectionView;
}) {
  const db = await getDatabase();
  const collection = db.collection<AthleteTwinProjectionDocument>(collectionName);
  const record = await collection.findOne({ "athlete.id": input.athleteId, view: input.view });
  return record ? normalizeProjection(record as unknown as Record<string, unknown>) : null;
}

export async function upsertTwinProjectionSnapshot(projection: AthleteTwinProjection) {
  const db = await getDatabase();
  const collection = db.collection<AthleteTwinProjectionDocument>(collectionName);
  const result = await collection.findOneAndUpdate(
    { "athlete.id": projection.athlete.id, view: projection.view },
    { $set: projection },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeProjection(result as unknown as Record<string, unknown>);
}
