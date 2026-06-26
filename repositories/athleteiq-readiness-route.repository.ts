import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { ReadinessRouteSnapshot } from "@/types/athleteiq-readiness-route";

const collectionName = "athleteiq_readiness_routes";
type ReadinessRouteDocument = Omit<ReadinessRouteSnapshot, "id">;

function normalizeSnapshot(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as ReadinessRouteSnapshot;
}

export async function getReadinessRouteSnapshot(input: { athleteId: string; localDate: string }) {
  const db = await getDatabase();
  const record = await db.collection<ReadinessRouteDocument>(collectionName).findOne({ athleteId: input.athleteId, localDate: input.localDate });
  return record ? normalizeSnapshot(record as unknown as Record<string, unknown>) : null;
}

export async function upsertReadinessRouteSnapshot(snapshot: ReadinessRouteSnapshot) {
  const db = await getDatabase();
  const result = await db.collection<ReadinessRouteDocument>(collectionName).findOneAndUpdate(
    { athleteId: snapshot.athleteId, localDate: snapshot.localDate },
    { $set: snapshot },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeSnapshot(result as unknown as Record<string, unknown>);
}
