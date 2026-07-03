// Configurable readiness/alert thresholds per team (GH-525 P0). Readiness is on
// the 0–5 gauge scale used across the coach surfaces. `greenMin` and below-that
// `yellowMin` split the traffic-light tone; anything below yellowMin is red.
export interface CoachThresholds {
  teamId: string;
  greenMin: number; // >= greenMin → green (ready)
  yellowMin: number; // >= yellowMin (and < greenMin) → yellow (watch); below → red (risk)
  updatedAt?: string;
  actorEmail?: string;
}

export const DEFAULT_COACH_THRESHOLDS: Omit<CoachThresholds, "teamId"> = {
  greenMin: 4,
  yellowMin: 2.5,
};

export type ReadinessTone = "green" | "yellow" | "red";

// Pure classifier — deterministic, no I/O. Shared by UI badges and any future
// server-side severity so the same thresholds mean the same thing everywhere.
export function classifyReadinessTone(
  value: number,
  thresholds: Pick<CoachThresholds, "greenMin" | "yellowMin">
): ReadinessTone {
  if (value >= thresholds.greenMin) return "green";
  if (value >= thresholds.yellowMin) return "yellow";
  return "red";
}

// Validate + normalize an incoming threshold pair. Clamps to the 0–5 gauge and
// guarantees greenMin > yellowMin so the bands never invert.
export function normalizeThresholds(input: { greenMin?: unknown; yellowMin?: unknown }): {
  greenMin: number;
  yellowMin: number;
} | null {
  const green = Number(input.greenMin);
  const yellow = Number(input.yellowMin);
  if (!Number.isFinite(green) || !Number.isFinite(yellow)) return null;
  const clamp = (n: number) => Math.min(5, Math.max(0, Math.round(n * 10) / 10));
  const greenMin = clamp(green);
  const yellowMin = clamp(yellow);
  if (greenMin <= yellowMin) return null;
  return { greenMin, yellowMin };
}
