import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { PainAlertRecord, PainAlertState } from "@/types/athleteiq-pain-safety";

const collectionName = "athleteiq_pain_alerts";
type PainAlertDocument = Omit<PainAlertRecord, "id">;

function normalizePainAlert(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as PainAlertRecord;
}

export async function upsertPainAlert(alert: Omit<PainAlertRecord, "id">) {
  const db = await getDatabase();
  const collection = db.collection<PainAlertDocument>(collectionName);
  const existing = await collection.findOne({ athleteId: alert.athleteId, localDate: alert.localDate });
  if (existing && (existing.state === "resolved" || existing.state === "dismissed")) {
    return normalizePainAlert(existing as unknown as Record<string, unknown>);
  }

  const result = await collection.findOneAndUpdate(
    { athleteId: alert.athleteId, localDate: alert.localDate },
    {
      $set: {
        state: alert.state,
        riskLevel: alert.riskLevel,
        painScore: alert.painScore,
        locations: alert.locations,
        reasonCodes: alert.reasonCodes,
        requiredCopyKey: alert.requiredCopyKey,
        updatedAt: alert.updatedAt
      },
      $setOnInsert: {
        auditHistory: alert.auditHistory,
        createdAt: alert.createdAt
      }
    },
    { upsert: true, returnDocument: "after" }
  );
  return normalizePainAlert(result as unknown as Record<string, unknown>);
}

export async function listPainAlertsByAthlete(athleteId: string) {
  const db = await getDatabase();
  const collection = db.collection<PainAlertDocument>(collectionName);
  const records = await collection.find({ athleteId }).sort({ localDate: -1, updatedAt: -1 }).toArray();
  return records.map((record) => normalizePainAlert(record as unknown as Record<string, unknown>));
}

export async function getPainAlertById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDatabase();
  const collection = db.collection<PainAlertDocument>(collectionName);
  const record = await collection.findOne({ _id: new ObjectId(id) });
  return record ? normalizePainAlert(record as unknown as Record<string, unknown>) : null;
}

export async function updatePainAlertState(input: {
  id: string;
  state: Extract<PainAlertState, "resolved" | "dismissed" | "monitor" | "coach_review">;
  actorEmail: string;
  note?: string;
}) {
  if (!ObjectId.isValid(input.id)) return null;
  const db = await getDatabase();
  const collection = db.collection<PainAlertDocument>(collectionName);
  const now = new Date().toISOString();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(input.id) },
    {
      $set: {
        state: input.state,
        statusUpdatedBy: input.actorEmail,
        statusNote: input.note,
        updatedAt: now
      },
      $push: { auditHistory: `${input.state}:${now}:${input.actorEmail}` }
    },
    { returnDocument: "after" }
  );
  return result ? normalizePainAlert(result as unknown as Record<string, unknown>) : null;
}
