export type CoachActionStatus = "open" | "acknowledged" | "applied" | "resolved" | "ignored" | "overridden";
export type CoachActionSeverity = "warning" | "critical";

export interface CoachActionRecord {
  _id?: string;
  athleteKey: string;
  date: string;
  recommendationKey: string;
  status: CoachActionStatus;
  severity?: CoachActionSeverity;
  sourceType?: "missed-check-in" | "readiness-threshold" | "recommendation";
  sourceId?: string;
  detail?: string;
  actorName: string;
  actorEmail: string;
  createdAt: string;
  updatedAt: string;
}
