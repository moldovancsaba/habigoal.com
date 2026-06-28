import { getDatabase } from "@/lib/mongodb";
import type { TelemetryEvent } from "@/types/telemetry";

const COLLECTION_NAME = "telemetry_events";

export async function insertTelemetryEvent(event: TelemetryEvent): Promise<void> {
  const db = await getDatabase();
  await db.collection(COLLECTION_NAME).insertOne(event);
}

export async function listTelemetryEvents(event?: string, limit = 100): Promise<TelemetryEvent[]> {
  const db = await getDatabase();
  const query = event ? { event } : {};
  return db
    .collection<TelemetryEvent>(COLLECTION_NAME)
    .find(query)
    .sort({ occurredAt: -1 })
    .limit(limit)
    .toArray();
}
