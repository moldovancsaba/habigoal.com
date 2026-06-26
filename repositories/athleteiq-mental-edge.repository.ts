import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { MentalEdgeRoutineCompletion, MentalEdgeRoutineId } from "@/types/athleteiq-mental-edge";

const collectionName = "athleteiq_mental_routine_completions";
type MentalEdgeRoutineCompletionDocument = Omit<MentalEdgeRoutineCompletion, "id">;

function normalizeCompletion(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as MentalEdgeRoutineCompletion;
}

export async function upsertMentalEdgeRoutineCompletion(input: MentalEdgeRoutineCompletionDocument) {
  const db = await getDatabase();
  const collection = db.collection<MentalEdgeRoutineCompletionDocument>(collectionName);
  await collection.updateOne(
    {
      athleteId: input.athleteId,
      routineId: input.routineId,
      localDate: input.localDate
    },
    { $set: input },
    { upsert: true }
  );

  const saved = await collection.findOne({
    athleteId: input.athleteId,
    routineId: input.routineId,
    localDate: input.localDate
  });
  return saved ? normalizeCompletion(saved as unknown as Record<string, unknown>) : { ...input };
}

export async function listCompletedMentalEdgeRoutineIds(input: {
  athleteId: string;
  localDate: string;
}) {
  const db = await getDatabase();
  const collection = db.collection<MentalEdgeRoutineCompletionDocument>(collectionName);
  const records = await collection.find({ athleteId: input.athleteId, localDate: input.localDate }).toArray();
  return records.map((record) => record.routineId).filter((value): value is MentalEdgeRoutineId => Boolean(value));
}
