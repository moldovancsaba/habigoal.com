export type SessionCategory = 'strength' | 'tactical' | 'endurance' | 'speed' | 'recovery' | 'match';

export interface SessionPlan {
  _id?: string;
  sessionId: string;
  organisationId: string;
  coachId: string;
  title: string;
  description: string;
  category: SessionCategory;
  date: string;
  durationMinutes: number;
  
  // TRN-002: Assign to individual athletes, groups, or teams
  assignedAthleteIds?: string[];
  assignedTeamId?: string;

  // TRN-005: Compare planned to completed load
  plannedLoadPoints: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface SessionRpeResult {
  sessionId: string;
  athleteId: string;
  rpeScore: number; // 1-10
  durationMinutes: number;
  completedLoadPoints: number; // calculated as RPE * duration
  recordedAt: string;
}

export interface Microcycle {
  microcycleId: string;
  teamId: string;
  startDate: string;
  endDate: string;
  goal: string;
  sessionIds: string[];
}
