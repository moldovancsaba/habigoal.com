// Source-linked deterministic insight signals (REC-001, #81).
//
// Recommendations are more trustworthy when the system can show *which records*
// produced them. This module turns real athlete inputs (readiness, habit recovery
// gaps, training-load risk, and the athlete's own reflection focus) into a small
// set of deterministic, versioned insight signals — each one carrying the source
// records it was derived from. No LLM, no fabrication: a signal only fires when
// its real input is present, and every signal lists its sources for disclosure.
//
// Pairs with the explainability catalog (#254, which explains the readiness
// *status*); this layer produces forward-looking *guidance* signals with sources.

export const INSIGHT_RULE_VERSION = "athlete-insights-1.0.0";

export type InsightSeverity = "low" | "medium" | "high";

export type InsightSourceType = "check_in" | "habit_record" | "training_load" | "reflection";

export interface InsightSource {
  type: InsightSourceType;
  id?: string;
  date?: string;
}

export interface InsightSignal {
  athleteId: string;
  date: string;
  /** Stable signal kind, e.g. "readiness_recovery". */
  kind: string;
  severity: InsightSeverity;
  /** i18n key under AthleteInsights.body.*. */
  bodyKey: string;
  /** Interpolation params for the body copy. */
  bodyParams: Record<string, string | number>;
  /** Records this signal was derived from — never empty. */
  sources: InsightSource[];
  ruleVersion: string;
}

export interface AthleteInsightsInput {
  athleteId: string;
  /** ISO date the signals are generated for. */
  date: string;
  readiness?: {
    /** 0–100 operating/readiness score. */
    score: number;
    date?: string;
    checkInId?: string;
  } | null;
  habitRecovery?: {
    completed: number;
    total: number;
    date?: string;
    recordId?: string;
  } | null;
  load?: {
    /** acute:chronic-style ratio (1.0 ≈ steady). */
    ratio: number;
    date?: string;
  } | null;
  reflectionFocus?: {
    text: string;
    date?: string;
    id?: string;
  } | null;
}

// Deterministic ordering: safety/load first, then readiness recovery, then habit,
// then the athlete's own focus. Within a kind, higher severity sorts first.
const KIND_RANK: Record<string, number> = {
  load_management: 0,
  readiness_recovery: 1,
  recovery_habit: 2,
  tomorrow_focus: 3,
};

const SEVERITY_RANK: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 };

function compareSignals(a: InsightSignal, b: InsightSignal): number {
  const kind = (KIND_RANK[a.kind] ?? 99) - (KIND_RANK[b.kind] ?? 99);
  if (kind !== 0) return kind;
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
}

// Build the ordered, source-linked signal set. Pure and synchronous — no I/O,
// no external calls — so it is fully deterministic and testable.
export function buildAthleteInsights(input: AthleteInsightsInput): InsightSignal[] {
  const signals: InsightSignal[] = [];
  const base = { athleteId: input.athleteId, date: input.date, ruleVersion: INSIGHT_RULE_VERSION };

  // Load management — highest priority (injury-risk guardrail).
  if (input.load && Number.isFinite(input.load.ratio) && input.load.ratio > 1.3) {
    signals.push({
      ...base,
      kind: "load_management",
      severity: input.load.ratio > 1.5 ? "high" : "medium",
      bodyKey: "loadManagement",
      bodyParams: { ratio: Number(input.load.ratio.toFixed(2)) },
      sources: [{ type: "training_load", date: input.load.date }],
    });
  }

  // Readiness recovery — low operating score needs recovery emphasis.
  if (input.readiness && Number.isFinite(input.readiness.score) && input.readiness.score < 50) {
    signals.push({
      ...base,
      kind: "readiness_recovery",
      severity: input.readiness.score < 30 ? "high" : "medium",
      bodyKey: "readinessRecovery",
      bodyParams: { score: Math.round(input.readiness.score) },
      sources: [{ type: "check_in", id: input.readiness.checkInId, date: input.readiness.date }],
    });
  }

  // Recovery-habit gap — recovery habits under-completed today.
  if (input.habitRecovery && input.habitRecovery.total > 0 && input.habitRecovery.completed < input.habitRecovery.total) {
    signals.push({
      ...base,
      kind: "recovery_habit",
      severity: input.habitRecovery.completed === 0 ? "medium" : "low",
      bodyKey: "recoveryHabit",
      bodyParams: { completed: input.habitRecovery.completed, total: input.habitRecovery.total },
      sources: [{ type: "habit_record", id: input.habitRecovery.recordId, date: input.habitRecovery.date }],
    });
  }

  // Tomorrow focus — surfaced from the athlete's own reflection.
  const focus = input.reflectionFocus?.text?.trim();
  if (focus) {
    signals.push({
      ...base,
      kind: "tomorrow_focus",
      severity: "low",
      bodyKey: "tomorrowFocus",
      bodyParams: { focus },
      sources: [{ type: "reflection", id: input.reflectionFocus?.id, date: input.reflectionFocus?.date }],
    });
  }

  return signals.sort(compareSignals);
}
