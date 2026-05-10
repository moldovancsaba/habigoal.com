export type CoachActionStatus = "acknowledged" | "applied";

export interface CoachActionRecord {
  _id?: string;
  athleteKey: string;
  date: string;
  recommendationKey: string;
  status: CoachActionStatus;
  actorName: string;
  actorEmail: string;
  createdAt: string;
  updatedAt: string;
}
