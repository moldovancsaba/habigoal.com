import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { OnboardingEventRecord, OnboardingEventType } from "@/types/onboarding";

const collectionName = "onboarding_events";

function mapEvent(raw: Record<string, unknown>): OnboardingEventRecord {
  return {
    id: typeof raw._id === "string" ? raw._id : undefined,
    userEmail: typeof raw.userEmail === "string" ? raw.userEmail : "",
    moduleId: typeof raw.moduleId === "string" ? raw.moduleId : "",
    event: raw.event as OnboardingEventType,
    route: typeof raw.route === "string" ? raw.route : "",
    stepId: typeof raw.stepId === "string" ? raw.stepId : undefined,
    idempotencyKey: typeof raw.idempotencyKey === "string" ? raw.idempotencyKey : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()
  };
}

export async function listOnboardingEventsByUser(userEmail: string): Promise<OnboardingEventRecord[]> {
  const db = await getDatabase();
  const events = await db
    .collection(collectionName)
    .find({ userEmail: userEmail.toLowerCase().trim() })
    .sort({ createdAt: 1 })
    .toArray();
  return events.map((event) => mapEvent(toJsonId(event) as Record<string, unknown>));
}

export async function insertOnboardingEventOnce(input: Omit<OnboardingEventRecord, "id" | "createdAt">): Promise<OnboardingEventRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const userEmail = input.userEmail.toLowerCase().trim();

  if (input.idempotencyKey) {
    const existing = await db.collection(collectionName).findOne({
      userEmail,
      moduleId: input.moduleId,
      idempotencyKey: input.idempotencyKey
    });
    if (existing) return mapEvent(toJsonId(existing) as Record<string, unknown>);
  }

  const record = {
    ...input,
    userEmail,
    createdAt: now
  };
  const result = await db.collection(collectionName).insertOne(record);
  return { ...record, id: result.insertedId.toString() };
}
