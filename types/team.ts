export interface Team {
  _id?: string;
  name: string;
  clubName?: string;
  unitName?: string;
  seasonLabel?: string;
  trainerEmails: string[];
  athleteIds: string[];
  notes?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}
