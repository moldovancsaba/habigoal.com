// Recovery trend interpretation (#6). Turns a series of daily recovery scores
// into a direction + plain-language interpretation key + readiness influence, so
// coaches read a trend rather than one-day raw numbers. Pure and deterministic;
// the consuming surface supplies real data (no fabrication) and renders the
// interpretation key via the next-intl `Recovery` namespace.

export type RecoveryTrendPoint = {
  date: string; // ISO date (YYYY-MM-DD)
  recoveryScore: number; // 0–100
};

export type TrendDirection = "improving" | "stable" | "declining" | "insufficient";
export type ReadinessInfluence = "boosts" | "neutral" | "reduces";

export type RecoveryTrendInterpretation = {
  direction: TrendDirection;
  latestScore: number | null;
  rollingAverage: number | null; // mean of the most-recent window
  deltaPct: number; // recent-window mean vs prior-window mean, percent
  sampleSize: number;
  interpretationKey: string; // key in the `Recovery` i18n namespace
  readinessInfluence: ReadinessInfluence;
};

// A change smaller than this (in %) is treated as holding steady, so day-to-day
// noise doesn't read as a real trend.
const STABLE_BAND_PCT = 5;

const KEY = {
  improving: "Recovery.trendImproving",
  stable: "Recovery.trendStable",
  declining: "Recovery.trendDeclining",
  insufficient: "Recovery.trendInsufficient"
} as const;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function interpretRecoveryTrend(points: RecoveryTrendPoint[]): RecoveryTrendInterpretation {
  const series = points
    .filter((p) => typeof p.recoveryScore === "number" && Number.isFinite(p.recoveryScore))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const insufficient: RecoveryTrendInterpretation = {
    direction: "insufficient",
    latestScore: series.length ? series[series.length - 1].recoveryScore : null,
    rollingAverage: null,
    deltaPct: 0,
    sampleSize: series.length,
    interpretationKey: KEY.insufficient,
    readinessInfluence: "neutral"
  };

  // Need at least two windows to compare a trend.
  if (series.length < 2) return insufficient;

  const window = Math.min(3, Math.floor(series.length / 2));
  if (window < 1) return insufficient;

  const scores = series.map((p) => p.recoveryScore);
  const recent = scores.slice(scores.length - window);
  const prior = scores.slice(scores.length - 2 * window, scores.length - window);

  const recentMean = mean(recent);
  const priorMean = mean(prior);
  const deltaPct = priorMean === 0 ? 0 : ((recentMean - priorMean) / priorMean) * 100;

  let direction: TrendDirection = "stable";
  let readinessInfluence: ReadinessInfluence = "neutral";
  let interpretationKey: string = KEY.stable;

  if (deltaPct > STABLE_BAND_PCT) {
    direction = "improving";
    readinessInfluence = "boosts";
    interpretationKey = KEY.improving;
  } else if (deltaPct < -STABLE_BAND_PCT) {
    direction = "declining";
    readinessInfluence = "reduces";
    interpretationKey = KEY.declining;
  }

  return {
    direction,
    latestScore: scores[scores.length - 1],
    rollingAverage: round1(recentMean),
    deltaPct: round1(deltaPct),
    sampleSize: series.length,
    interpretationKey,
    readinessInfluence
  };
}
