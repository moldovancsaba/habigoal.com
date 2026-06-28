// Functional Movement Screen (FMS) — the recognised 7-test movement intake.
// Each sub-test is scored 0–3; a pain flag on a test forces that sub-test to 0
// per the standard FMS rule. The composite (0–21) is computed server-side and
// feeds the injury-risk engine. This is health data (injury PII) — access-gated
// and listed in the GDPR PII registry.

export const FMS_SUBTESTS = [
  "deepSquat",
  "hurdleStep",
  "inlineLunge",
  "shoulderMobility",
  "activeStraightLegRaise",
  "trunkStabilityPushup",
  "rotaryStability"
] as const;

export type FmsSubtest = (typeof FMS_SUBTESTS)[number];

export type FmsScores = Record<FmsSubtest, number>;
export type FmsPainFlags = Partial<Record<FmsSubtest, boolean>>;

export type FmsScreen = {
  id?: string;
  athleteId: string;
  date: string;
  scores: FmsScores;
  painFlags: FmsPainFlags;
  composite: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
};
