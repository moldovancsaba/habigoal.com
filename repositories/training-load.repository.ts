import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { TrainingLoadRecord, TrainingLoadSource } from "@/types/training-load";

const collectionName = "training_load_records";

function normalizeTrainingLoadRecord(raw: Record<string, unknown>): TrainingLoadRecord {
  const jsonRecord = toJsonId(raw) as Record<string, unknown> & { _id?: string };
  const rpe = typeof jsonRecord.rpe === "number" ? jsonRecord.rpe : null;

  return {
    _id: typeof jsonRecord._id === "string" ? jsonRecord._id : undefined,
    athleteId: typeof jsonRecord.athleteId === "string" ? jsonRecord.athleteId : "",
    date: typeof jsonRecord.date === "string" ? jsonRecord.date : "",
    source: typeof jsonRecord.source === "string" ? jsonRecord.source as TrainingLoadSource : "athlete",
    activityTypes: Array.isArray(jsonRecord.activityTypes) ? jsonRecord.activityTypes.filter((value): value is string => typeof value === "string") : [],
    durationMinutes: typeof jsonRecord.durationMinutes === "number" ? jsonRecord.durationMinutes : 0,
    rpe,
    loadPoints: typeof jsonRecord.loadPoints === "number" ? jsonRecord.loadPoints : 0,
    note: typeof jsonRecord.note === "string" ? jsonRecord.note : undefined,
    createdBy: typeof jsonRecord.createdBy === "string" ? jsonRecord.createdBy : "",
    createdAt: typeof jsonRecord.createdAt === "string" ? jsonRecord.createdAt : "",
    updatedAt: typeof jsonRecord.updatedAt === "string" ? jsonRecord.updatedAt : ""
  };
}

export async function listTrainingLoadRecordsByAthleteId(input: {
  athleteId: string;
  from?: string;
  to?: string;
}): Promise<TrainingLoadRecord[]> {
  const db = await getDatabase();
  const dateQuery: Record<string, string> = {};
  if (input.from) dateQuery.$gte = input.from;
  if (input.to) dateQuery.$lte = input.to;
  const query = {
    athleteId: input.athleteId,
    ...(Object.keys(dateQuery).length ? { date: dateQuery } : {})
  };
  const records = await db.collection(collectionName).find(query).sort({ date: 1, createdAt: 1 }).toArray();
  return records.map((record) => normalizeTrainingLoadRecord(record as Record<string, unknown>));
}

export async function createTrainingLoadRecord(input: Omit<TrainingLoadRecord, "_id" | "createdAt" | "updatedAt">): Promise<TrainingLoadRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const record = {
    ...input,
    createdAt: now,
    updatedAt: now
  };
  const result = await db.collection(collectionName).insertOne(record);
  const saved = await db.collection(collectionName).findOne({ _id: result.insertedId });
  return normalizeTrainingLoadRecord((saved ?? record) as Record<string, unknown>);
}
