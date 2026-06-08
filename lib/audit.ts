import { createHash } from "crypto";
import { insertAuditEvent } from "@/repositories/audit-event.repository";
import type { AuditAction } from "@/types/audit-event";

export async function logAuditEvent(input: {
  organisationId?: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await insertAuditEvent({
      eventId: crypto.randomUUID(),
      organisationId: input.organisationId ?? "default",
      actorEmail: input.actorEmail,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
      ipHash: input.ipAddress
        ? createHash("sha256").update(input.ipAddress).digest("hex")
        : undefined,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to write audit event:", error);
  }
}
