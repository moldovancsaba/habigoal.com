export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "athlete.create"
  | "athlete.update"
  | "athlete.delete"
  | "athlete.export"
  | "athlete.erase"
  | "athleteiq.daily_engine.run"
  | "checkin.create"
  | "checkin.duplicate_blocked"
  | "consent.grant"
  | "consent.withdraw"
  | "recommendation.accept"
  | "recommendation.ignore"
  | "recommendation.override"
  | "device.connect"
  | "device.disconnect"
  | "device.sync"
  | "report.generate"
  | "settings.update"
  | "queue.retry"
  | "admin.governance";

export interface AuditEvent {
  _id?: string;
  eventId: string;
  organisationId: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
  createdAt: string;
}
