import { getDatabase } from "@/lib/mongodb";
import type { AuditEvent } from "@/types/audit-event";

const COLLECTION = "audit_events";

export async function insertAuditEvent(event: Omit<AuditEvent, "_id">): Promise<void> {
  const db = await getDatabase();
  await db.collection(COLLECTION).insertOne(event);
}

export async function listAuditEvents(options: {
  organisationId?: string;
  resourceId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditEvent[]> {
  const db = await getDatabase();
  const filter: Record<string, unknown> = {};
  if (options.organisationId) filter.organisationId = options.organisationId;
  if (options.resourceId) filter.resourceId = options.resourceId;
  if (options.action) filter.action = options.action;

  const events = await db
    .collection(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 100)
    .toArray();

  return events as unknown as AuditEvent[];
}
