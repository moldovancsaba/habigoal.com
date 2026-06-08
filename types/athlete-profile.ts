export type AthleteStatus = 'active' | 'injured' | 'unavailable' | 'trialist' | 'archived';

export interface AthleteProfile {
  _id?: string;
  athleteId: string;
  organisationId: string;
  teamId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: AthleteStatus;
  position?: string;
  
  // ATH-005: Parent/guardian association for youth athletes
  parentGuardianId?: string;

  // ATH-004: Injury history flags (internal view only)
  injuryHistoryFlags: string[];

  // ATH-007: Custom attributes per organisation
  customAttributes: Record<string, string | number | boolean>;

  createdAt: string;
  updatedAt: string;
}
