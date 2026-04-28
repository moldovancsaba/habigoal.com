import { AssessmentDomain } from "@/types/assessment";

export interface DomainStandard {
  target: number;
  min: number;
}

export interface AgeGroupStandard {
  movement: DomainStandard;
  social: DomainStandard;
  mental: DomainStandard;
  ski: DomainStandard;
}

export const standards: Record<string, AgeGroupStandard> = {
  "4-6": {
    movement: { target: 4.5, min: 3.0 },
    social: { target: 4.0, min: 2.5 },
    mental: { target: 3.5, min: 2.0 },
    ski: { target: 4.0, min: 2.5 }
  },
  "7-9": {
    movement: { target: 5.0, min: 3.5 },
    social: { target: 4.5, min: 3.0 },
    mental: { target: 4.0, min: 2.5 },
    ski: { target: 4.5, min: 3.0 }
  },
  "10-12": {
    movement: { target: 5.5, min: 4.0 },
    social: { target: 5.0, min: 3.5 },
    mental: { target: 4.5, min: 3.0 },
    ski: { target: 5.0, min: 3.5 }
  }
};

export function getStandardForAgeGroup(ageGroup: string): AgeGroupStandard | null {
  return standards[ageGroup] || null;
}
