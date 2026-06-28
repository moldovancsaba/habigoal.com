// Pure FMS scoring and validation logic. No I/O — unit-testable in isolation.
//
// Scoring: each of the 7 sub-tests is graded 0–3. A recorded pain flag on a
// sub-test forces that sub-test to 0 (standard FMS rule). The composite is the
// sum of the (pain-adjusted) sub-scores, range 0–21.
//
// Injury-risk weighting: a composite at or below FMS_RISK_COMPOSITE_THRESHOLD
// (14 — the established Kiesel et al. cutoff associated with elevated injury
// risk) is an elevated-risk signal; any recorded pain flag is an additional
// elevated-risk signal that also warrants human review.

import { FMS_SUBTESTS, type FmsPainFlags, type FmsScores, type FmsScreen, type FmsSubtest } from "@/types/athleteiq-fms";

export { FMS_SUBTESTS };
export type { FmsSubtest };

export const FMS_SCORE_MIN = 0;
export const FMS_SCORE_MAX = 3;
export const FMS_COMPOSITE_MAX = 21;
export const FMS_RISK_COMPOSITE_THRESHOLD = 14;

// Validates raw sub-test scores: every sub-test must be present and an integer
// within [0, 3]. Returns an empty array when valid.
export function validateFmsScores(scores: unknown): string[] {
  const errors: string[] = [];
  if (typeof scores !== "object" || scores === null) {
    return ["scores object is required"];
  }
  const record = scores as Record<string, unknown>;
  for (const subtest of FMS_SUBTESTS) {
    const value = record[subtest];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`${subtest} must be an integer`);
    } else if (value < FMS_SCORE_MIN || value > FMS_SCORE_MAX) {
      errors.push(`${subtest} must be between ${FMS_SCORE_MIN} and ${FMS_SCORE_MAX}`);
    }
  }
  return errors;
}

// Applies the pain-forces-zero rule and returns a normalised score map.
export function applyPainRule(scores: FmsScores, painFlags: FmsPainFlags): FmsScores {
  const adjusted = {} as FmsScores;
  for (const subtest of FMS_SUBTESTS) {
    adjusted[subtest] = painFlags[subtest] ? 0 : scores[subtest];
  }
  return adjusted;
}

export function computeFmsComposite(scores: FmsScores, painFlags: FmsPainFlags): number {
  const adjusted = applyPainRule(scores, painFlags);
  return FMS_SUBTESTS.reduce((sum, subtest) => sum + adjusted[subtest], 0);
}

export function hasAnyPainFlag(painFlags: FmsPainFlags): boolean {
  return FMS_SUBTESTS.some((subtest) => Boolean(painFlags[subtest]));
}

// Builds a persisted screen: applies the pain rule, computes the composite, and
// stamps recorder/date. `id` is assigned by the repository on insert.
export function buildFmsScreen(input: {
  athleteId: string;
  date: string;
  scores: FmsScores;
  painFlags: FmsPainFlags;
  notes?: string;
  recordedBy: string;
  now?: Date;
}): FmsScreen {
  const painFlags: FmsPainFlags = {};
  for (const subtest of FMS_SUBTESTS) {
    if (input.painFlags[subtest]) painFlags[subtest] = true;
  }
  const scores = applyPainRule(input.scores, painFlags);
  return {
    athleteId: input.athleteId,
    date: input.date,
    scores,
    painFlags,
    composite: computeFmsComposite(input.scores, painFlags),
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 1000) : undefined,
    recordedBy: input.recordedBy,
    createdAt: (input.now ?? new Date()).toISOString()
  };
}
