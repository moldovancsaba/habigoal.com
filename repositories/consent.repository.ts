import { getDatabase } from "@/lib/mongodb";
import { ConsentRecord, ConsentPurpose } from "../types/consent";

const COLLECTION_NAME = "consents";

export async function findActiveConsent(
  athleteId: string,
  purpose: ConsentPurpose
): Promise<ConsentRecord | null> {
  const db = await getDatabase();
  const collection = db.collection<ConsentRecord>(COLLECTION_NAME);
  
  // We want to find the latest consent record for the purpose
  // that is either active or pending_guardian.
  const record = await collection.findOne(
    { athleteId, purpose, status: { $in: ["active", "pending_guardian"] } },
    { sort: { createdAt: -1 } }
  );

  return record;
}

export async function findLatestConsent(
  athleteId: string,
  purpose: ConsentPurpose
): Promise<ConsentRecord | null> {
  const db = await getDatabase();
  const collection = db.collection<ConsentRecord>(COLLECTION_NAME);
  return collection.findOne(
    { athleteId, purpose },
    { sort: { createdAt: -1 } }
  );
}

export async function findConsentsByAthleteId(athleteId: string): Promise<ConsentRecord[]> {
  const db = await getDatabase();
  const collection = db.collection<ConsentRecord>(COLLECTION_NAME);
  return await collection.find({ athleteId }).sort({ createdAt: -1 }).toArray();
}

export async function upsertConsent(consent: ConsentRecord): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const filter = { consentId: consent.consentId };
  const update = {
    $set: {
      ...consent,
      updatedAt: new Date().toISOString(),
    },
    $setOnInsert: {
      createdAt: new Date().toISOString(),
    },
  };

  await collection.updateOne(filter, update, { upsert: true });
}

export async function updateConsentStatus(
  consentId: string,
  status: ConsentRecord["status"],
  metadata?: Partial<ConsentRecord>
): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  await collection.updateOne(
    { consentId },
    {
      $set: {
        status,
        ...metadata,
        updatedAt: new Date().toISOString(),
      },
    }
  );
}
