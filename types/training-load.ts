export type TrainingLoadSource = "athlete" | "trainer" | "session_debrief" | "check_in";
export type TrainingLoadZone = "under" | "optimal" | "heavy" | "risk" | "unknown";

export interface TrainingLoadRecord {
  _id?: string;
  athleteId: string;
  date: string;
  source: TrainingLoadSource;
  activityTypes: string[];
  durationMinutes: number;
  rpe: number | null;
  loadPoints: number;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingLoadSummary {
  weekStart: string;
  totalPoints: number;
  zone: TrainingLoadZone;
  records: number;
}
