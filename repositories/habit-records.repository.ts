import { getDatabase } from "@/lib/mongodb";
import { normalizeHabitStatuses } from "@/lib/athlete-habits";
import { toJsonId } from "@/lib/utils";
import type { HabitRecord } from "@/types/habit-record";

const collectionName = "habit_records";

function normalizeHabitRecord(raw: Record<string, unknown>): HabitRecord {
  const jsonRecord = toJsonId(raw) as Record<string, unknown> & { _id?: string };
  return {
    _id: typeof jsonRecord._id === "string" ? jsonRecord._id : undefined,
    athleteId: typeof jsonRecord.athleteId === "string" ? jsonRecord.athleteId : "",
    date: typeof jsonRecord.date === "string" ? jsonRecord.date : "",
    statuses: normalizeHabitStatuses(raw.statuses as Record<string, unknown> | undefined)
    ,
    createdAt: typeof jsonRecord.createdAt === "string" ? jsonRecord.createdAt : "",
    updatedAt: typeof jsonRecord.updatedAt === "string" ? jsonRecord.updatedAt : ""
  };
}

export async function listHabitRecordsByAthleteId(athleteId: string): Promise<HabitRecord[]> {
  const db = await getDatabase();
  const records = await db.collection(collectionName).find({ athleteId }).sort({ date: 1 }).toArray();
  return records.map((record) => normalizeHabitRecord(record as Record<string, unknown>));
}

export async function getHabitRecordByAthleteIdAndDate(athleteId: string, date: string): Promise<HabitRecord | null> {
  const db = await getDatabase();
  const record = await db.collection(collectionName).findOne({ athleteId, date });
  return record ? normalizeHabitRecord(record as Record<string, unknown>) : null;
}

export async function upsertHabitRecord(input: {
  athleteId: string;
  date: string;
  statuses: Record<string, boolean>;
}): Promise<HabitRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const statuses = normalizeHabitStatuses(input.statuses);

  await db.collection(collectionName).updateOne(
    { athleteId: input.athleteId, date: input.date },
    {
      $set: {
        statuses,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  const saved = await db.collection(collectionName).findOne({ athleteId: input.athleteId, date: input.date });
  return normalizeHabitRecord((saved ?? {}) as Record<string, unknown>);
}
