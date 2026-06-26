import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { ReflectionEntry, ReflectionVisibility } from "@/types/athleteiq-reflection";

const collectionName = "athleteiq_reflections";
type ReflectionDocument = Omit<ReflectionEntry, "id"> & { id: string };

function normalizeReflection(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as ReflectionEntry;
}

export async function upsertReflection(entry: ReflectionEntry) {
  const db = await getDatabase();
  const result = await db.collection<ReflectionDocument>(collectionName).findOneAndUpdate(
    { id: entry.id },
    { $set: entry },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeReflection(result as unknown as Record<string, unknown>);
}

export async function listReflectionsByDay(input: { athleteId: string; localDate: string }) {
  const db = await getDatabase();
  const records = await db.collection<ReflectionDocument>(collectionName)
    .find({ athleteId: input.athleteId, localDate: input.localDate })
    .sort({ createdAt: 1 })
    .toArray();
  return records.map((record) => normalizeReflection(record as unknown as Record<string, unknown>));
}

export async function getReflection(id: string) {
  const db = await getDatabase();
  const record = await db.collection<ReflectionDocument>(collectionName).findOne({ id });
  return record ? normalizeReflection(record as unknown as Record<string, unknown>) : null;
}

export async function updateReflectionVisibility(input: {
  entry: ReflectionEntry;
  visibility: ReflectionVisibility;
  actorEmail: string;
}) {
  const now = new Date().toISOString();
  return upsertReflection({
    ...input.entry,
    visibility: input.visibility,
    updatedAt: now,
    auditHistory: [...input.entry.auditHistory, `visibility:${input.visibility}:${now}:${input.actorEmail}`]
  });
}
