export type SessionPlanVariant = "standard" | "controlled" | "recovery";

export interface SessionPlanDay {
  isoDate: string;
  variant: SessionPlanVariant;
  focus: string;
  loadTarget: string;
  coachNote: string;
  athleteNames: string[];
}

export interface SessionPlanRecord {
  _id?: string;
  weekStart: string;
  scope: string;
  variant: SessionPlanVariant;
  days: SessionPlanDay[];
  summary: {
    totalAthletes: number;
    supportAthletes: number;
    missingCheckIns: number;
    averageLoad: number;
  };
  actorName: string;
  actorEmail: string;
  createdAt: string;
  updatedAt: string;
}
