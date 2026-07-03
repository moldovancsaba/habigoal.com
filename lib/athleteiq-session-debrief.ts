// Session debrief analysis (GH-527 P2). Turns the raw debrief into a plan-vs-actual
// read: the effort-based load (already computed from RPE) adjusted by how much of
// the session was actually completed, plus an adherence band. Pure + honest —
// no fabrication; realized load is simply estimated × completion.

export type AdherenceBand = "full" | "partial" | "low";

export interface DebriefAnalysis {
  plannedDurationMinutes: number;
  estimatedLoadPoints: number; // effort-based (RPE × duration model)
  realizedLoadPoints: number; // estimated × completion%
  adherencePct: number;
  adherenceBand: AdherenceBand;
}

export function adherenceBand(completionPct: number): AdherenceBand {
  if (completionPct >= 90) return "full";
  if (completionPct >= 50) return "partial";
  return "low";
}

export function deriveDebriefAnalysis(input: {
  plannedDurationMinutes: number;
  estimatedLoadPoints: number;
  completionPct: number;
}): DebriefAnalysis {
  const completion = Math.min(100, Math.max(0, input.completionPct));
  return {
    plannedDurationMinutes: input.plannedDurationMinutes,
    estimatedLoadPoints: input.estimatedLoadPoints,
    realizedLoadPoints: Math.round(input.estimatedLoadPoints * (completion / 100)),
    adherencePct: completion,
    adherenceBand: adherenceBand(completion),
  };
}
