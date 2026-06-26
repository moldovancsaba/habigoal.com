import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AthleteIqDayEntry } from "@/types/athleteiq-calendar";

const collectionName = "athleteiq_calendar_entries";
type AthleteIqDayEntryDocument = Omit<AthleteIqDayEntry, "id"> & { id: string };

function normalizeEntry(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as AthleteIqDayEntry;
}

export async function listDayEntries(input: { athleteId: string; localDate: string }) {
  const db = await getDatabase();
  const records = await db.collection<AthleteIqDayEntryDocument>(collectionName)
    .find({ athleteId: input.athleteId, localDate: input.localDate, deletedAt: { $exists: false } })
    .sort({ startAt: 1, createdAt: 1 })
    .toArray();
  return records.map((record) => normalizeEntry(record as unknown as Record<string, unknown>));
}

export async function getDayEntry(id: string) {
  const db = await getDatabase();
  const record = await db.collection<AthleteIqDayEntryDocument>(collectionName).findOne({ id, deletedAt: { $exists: false } });
  return record ? normalizeEntry(record as unknown as Record<string, unknown>) : null;
}

export async function upsertDayEntry(entry: AthleteIqDayEntry) {
  const db = await getDatabase();
  const result = await db.collection<AthleteIqDayEntryDocument>(collectionName).findOneAndUpdate(
    { id: entry.id },
    { $set: entry },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeEntry(result as unknown as Record<string, unknown>);
}

export async function updateDayEntry(input: {
  entry: AthleteIqDayEntry;
  patch: Partial<Pick<AthleteIqDayEntry, "type" | "startAt" | "endAt" | "titleKeyOrText" | "visibility">>;
  actorEmail: string;
}) {
  const now = new Date().toISOString();
  return upsertDayEntry({
    ...input.entry,
    ...input.patch,
    updatedAt: now,
    auditHistory: [...input.entry.auditHistory, `updated:${now}:${input.actorEmail}`]
  });
}

export async function deleteDayEntry(input: { entry: AthleteIqDayEntry; actorEmail: string }) {
  const now = new Date().toISOString();
  return upsertDayEntry({
    ...input.entry,
    deletedAt: now,
    updatedAt: now,
    auditHistory: [...input.entry.auditHistory, `deleted:${now}:${input.actorEmail}`]
  });
}
