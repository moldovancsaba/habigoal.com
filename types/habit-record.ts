export interface HabitRecord {
  _id?: string;
  athleteId: string;
  date: string;
  statuses: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}
