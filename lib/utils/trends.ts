import type { AssessmentRecord } from "@/types/assessment";

export interface TrendPoint {
  date: string;
  movement: number;
  social: number;
  mental: number;
  ski: number;
}

export function calculateTrend(assessments: AssessmentRecord[]): TrendPoint[] {
  return assessments.map((a) => ({
    date: a.session.date,
    movement: a.computed.movementAverage || 0,
    social: a.computed.socialAverage || 0,
    mental: a.computed.mentalAverage || 0,
    ski: a.computed.ski || 0
  }));
}
