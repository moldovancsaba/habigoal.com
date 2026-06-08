import { getDatabase } from "@/lib/mongodb";
import { TrainersServicePayload } from "../types/trainers-service";

const COLLECTION_NAME = "trainers_services";

export async function upsertTrainersService(payload: TrainersServicePayload): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const filter = { draftId: payload.draftId };
  const update = {
    $set: {
      ...payload,
      updatedAt: new Date().toISOString(),
    },
    $setOnInsert: {
      createdAt: new Date().toISOString(),
    }
  };

  await collection.updateOne(filter, update, { upsert: true });
}

export async function countTrainersServices(): Promise<number> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);
  return collection.countDocuments();
}

export async function getTrainersServiceById(id: string): Promise<TrainersServicePayload | null> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);
  return (await collection.findOne({ draftId: id })) as TrainersServicePayload | null;
}

export async function listTrainersServices(limit = 50): Promise<TrainersServicePayload[]> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);
  return (await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray()) as unknown as TrainersServicePayload[];
}
