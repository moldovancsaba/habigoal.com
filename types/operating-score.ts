export type OperatingScoreComponent = "readiness" | "habits" | "recovery" | "trainingLoad" | "performance";

export type ReadinessZone = "peak" | "good" | "moderate" | "fatigued" | "recovery" | "unknown";

export interface OperatingScoreSourceCompleteness {
  checkIn: boolean;
  habits: boolean;
  recovery: boolean;
  trainingLoad: boolean;
  performance: boolean;
}

export interface DailyOperatingMetrics {
  athleteId: string;
  date: string;
  scoreVersion: string;
  athleteIqScore: number | null;
  readinessScore: number | null;
  habitScore: number | null;
  recoveryScore: number | null;
  trainingLoadPoints: number | null;
  // Acute:chronic workload ratio (trailing 7-day / trailing 28-day average load).
  // Null until at least ACWR_MIN_CHRONIC_DAYS of prior load history exists — no
  // fabricated ratio from a thin sample (P3 #528).
  trainingLoadAcwr: number | null;
  trainingLoadScore: number | null;
  performanceScore: number | null;
  readinessZone: ReadinessZone;
  sourceCompleteness: OperatingScoreSourceCompleteness;
  componentWeights: Record<OperatingScoreComponent, number>;
}
