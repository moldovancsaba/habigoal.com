import { getDatabase } from "@/lib/mongodb";
import { RawPayload } from "../types/canonical-metric";

const COLLECTION_NAME = "raw_metrics";

export async function upsertRawPayload(payload: RawPayload): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const filter = { payloadId: payload.payloadId };
  const update = {
    $set: {
      ...payload,
    },
  };

  await collection.updateOne(filter, update, { upsert: true });
}

export async function upsertManyRawPayloads(payloads: RawPayload[]): Promise<void> {
  if (payloads.length === 0) return;

  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const operations = payloads.map((payload) => ({
    updateOne: {
      filter: { payloadId: payload.payloadId },
      update: {
        $set: {
          ...payload,
        },
      },
      upsert: true,
    },
  }));

  await collection.bulkWrite(operations);
}
