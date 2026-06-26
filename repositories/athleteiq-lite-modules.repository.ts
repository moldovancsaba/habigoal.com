import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { LiteModuleEntry } from "@/types/athleteiq-lite-modules";

const collectionName = "athleteiq_lite_module_entries";
type LiteModuleEntryDocument = Omit<LiteModuleEntry, "id"> & { id: string };

function normalizeEntry(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as LiteModuleEntry;
}

export async function upsertLiteModuleEntry(entry: LiteModuleEntry) {
  const db = await getDatabase();
  const collection = db.collection<LiteModuleEntryDocument>(collectionName);
  const filter = entry.idempotencyKey
    ? { athleteId: entry.athleteId, moduleKey: entry.moduleKey, idempotencyKey: entry.idempotencyKey }
    : { id: entry.id };
  const existing = await collection.findOne(filter);
  if (existing) return normalizeEntry(existing as unknown as Record<string, unknown>);

  await collection.insertOne(entry);
  return entry;
}

export async function listLiteModuleEntriesByDay(input: { athleteId: string; localDate: string }) {
  const db = await getDatabase();
  const records = await db.collection<LiteModuleEntryDocument>(collectionName)
    .find({ athleteId: input.athleteId, localDate: input.localDate })
    .sort({ updatedAt: 1 })
    .toArray();
  return records.map((record) => normalizeEntry(record as unknown as Record<string, unknown>));
}
