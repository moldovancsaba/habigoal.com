import { AthleteTwin } from "../types/athlete-twin";
import { buildRecommendation } from "@/lib/engines/recommendation.engine";
import { computeReadiness } from "@/lib/engines/readiness.engine";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { getChildById } from "@/repositories/child.repository";
import { getLatestFms } from "@/services/athleteiq-fms.service";
import {
  classifyFreshness,
  minConfidenceBand,
  CONFIDENCE_BAND_RANK,
  type ConfidenceBand,
  type DataFreshness,
} from "@/lib/data-confidence";
import { ObjectId } from "mongodb";

// Bump when the report's structure or source-note contract changes, so a stored
// report can be traced to the logic that produced it (RPT-005, #200).
export const REPORT_VERSION = "report-1.1.0";

export type ReportDimensionKey =
  | "physical"
  | "performance"
  | "technical"
  | "recovery"
  | "cognitive";

export interface ReportDimensionSource {
  dimension: ReportDimensionKey;
  sources: string[];
  confidence: ConfidenceBand;
  updatedAt: string | null;
}

// Complete, structured provenance for a report: which records produced it, how
// fresh they are, and how confident we are — so a report is honest about its
// inputs instead of presenting derived numbers without context (RPT-005, #200).
export interface ReportProvenance {
  reportVersion: string;
  generatedAt: string;
  dateRange: { from: string; to: string };
  dimensions: ReportDimensionSource[];
  movementScreen: { present: boolean; date: string | null };
  coachBaselineNotes: boolean;
  lastUpdatedAt: string | null;
  freshness: DataFreshness;
  overallConfidence: ConfidenceBand;
}

export interface AthleteReport {
  athleteId: string;
  reportDate: string;
  dateRange: { from: string; to: string };
  summary: string;
  keyMetrics: Record<string, number | string>;
  coachNotes: string[];
  // Coaching guidance shown in the report body. Plain language only — no engine
  // or AI framing in user-facing copy (owner ruling).
  guidanceCommentary: string;
  sourceDataNotes: string[];
  // Structured source provenance (RPT-005, #200). sourceDataNotes is the
  // human-readable projection of this.
  provenance: ReportProvenance;
}

const REPORT_DIMENSIONS: ReportDimensionKey[] = [
  "physical",
  "performance",
  "technical",
  "recovery",
  "cognitive",
];

function downgradeBand(band: ConfidenceBand, steps: number): ConfidenceBand {
  const order: ConfidenceBand[] = ["none", "low", "medium", "high"];
  const rank = Math.max(0, CONFIDENCE_BAND_RANK[band] - steps);
  return order[rank];
}

// Pure provenance builder over a twin snapshot — no DB access, fully testable.
// Overall confidence is the weakest contributing dimension (those that actually
// have sources) combined with the recommendation confidence, then downgraded one
// step if the freshest contributing data is stale or missing. Never overstates.
export function buildReportProvenance(input: {
  twin: AthleteTwin;
  dateRange: { from: string; to: string };
  generatedAt: string;
  recommendationConfidence: ConfidenceBand | string | null | undefined;
  movementScreen: { present: boolean; date: string | null };
  coachBaselineNotes: boolean;
  now: number;
}): ReportProvenance {
  const { twin } = input;
  const dimensions: ReportDimensionSource[] = REPORT_DIMENSIONS.map((dimension) => {
    const snapshot = twin[dimension];
    return {
      dimension,
      sources: snapshot?.sources ?? [],
      confidence: (snapshot?.confidence as ConfidenceBand) ?? "none",
      updatedAt: snapshot?.updatedAt ?? null,
    };
  });

  const contributing = dimensions.filter((d) => d.sources.length > 0);
  const freshness = classifyFreshness(twin.lastUpdatedAt ?? null, input.now);

  let overallConfidence = minConfidenceBand([
    ...contributing.map((d) => d.confidence),
    input.recommendationConfidence,
  ]);
  // No contributing source at all → none, regardless of the recommendation.
  if (contributing.length === 0) overallConfidence = "none";
  if (freshness === "stale" || freshness === "missing") {
    overallConfidence = downgradeBand(overallConfidence, 1);
  }

  return {
    reportVersion: REPORT_VERSION,
    generatedAt: input.generatedAt,
    dateRange: input.dateRange,
    dimensions,
    movementScreen: input.movementScreen,
    coachBaselineNotes: input.coachBaselineNotes,
    lastUpdatedAt: twin.lastUpdatedAt ?? null,
    freshness,
    overallConfidence,
  };
}

// Human-readable projection of the provenance. The final "Confidence: <band>"
// line is a stable contract consumed by the parent-safe projection (#261) and
// the reports hub badge — keep it last and in this exact shape.
export function provenanceToSourceNotes(p: ReportProvenance): string[] {
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const notes = [`Date range: ${p.dateRange.from} to ${p.dateRange.to}`];
  for (const d of p.dimensions) {
    const sources = d.sources.length ? d.sources.join(", ") : "none";
    const updated = d.updatedAt ? d.updatedAt.slice(0, 10) : "never";
    notes.push(`${titleCase(d.dimension)} data: ${sources} (confidence ${d.confidence}, updated ${updated})`);
  }
  notes.push(`Movement screen (FMS): ${p.movementScreen.present ? p.movementScreen.date ?? "yes" : "none"}`);
  notes.push(`Coach baseline notes: ${p.coachBaselineNotes ? "yes" : "none"}`);
  notes.push(`Data freshness: ${p.freshness}`);
  notes.push(`Confidence: ${p.overallConfidence}`);
  return notes;
}

export class ReportingService {
  async generateAthleteReport(
    athleteId: string,
    twin: AthleteTwin,
    options?: { from?: string; to?: string }
  ): Promise<AthleteReport> {
    const to = options?.to ?? new Date().toISOString().split("T")[0];
    const from = options?.from ?? to;
    const child = ObjectId.isValid(athleteId) ? await getChildById(new ObjectId(athleteId)) : null;

    const latestFms = await getLatestFms(athleteId);
    const context = { athleteId, twin, organisationId: twin.organisationId, latestFms };
    const [readiness, recovery, injuryRisk] = await Promise.all([
      computeReadiness(context),
      computeRecovery(context),
      computeInjuryRisk(context),
    ]);
    const recommendation = buildRecommendation(twin, readiness, recovery, injuryRisk, child?.birthDate);

    const generatedAt = new Date().toISOString();
    const provenance = buildReportProvenance({
      twin,
      dateRange: { from, to },
      generatedAt,
      recommendationConfidence: recommendation.confidence,
      movementScreen: { present: Boolean(latestFms), date: latestFms?.date ?? null },
      coachBaselineNotes: Boolean(child?.baselineProfile?.coachBaselineNotes),
      now: Date.now(),
    });

    return {
      athleteId,
      reportDate: generatedAt,
      dateRange: { from, to },
      summary: "Athlete Operating Report",
      keyMetrics: {
        "Readiness Score": readiness.result.score,
        "Readiness Zone": readiness.result.zone,
        "Recovery Status": recovery.result.status,
        "Injury Risk Level": injuryRisk.result.riskLevel,
        "Sleep Quality (7d)": twin.recovery?.sleepQualityScore7d ?? "n/a",
        ACWR: twin.performance?.acwr ?? "n/a",
      },
      coachNotes: child?.baselineProfile?.coachBaselineNotes
        ? [child.baselineProfile.coachBaselineNotes]
        : [],
      guidanceCommentary: `${recommendation.text}\n\nReason: ${recommendation.reason}`,
      sourceDataNotes: provenanceToSourceNotes(provenance),
      provenance,
    };
  }

  async generateTeamReport(athleteIds: string[], twins: AthleteTwin[]) {
    const reports = await Promise.all(
      twins.map((twin, i) => this.generateAthleteReport(athleteIds[i] ?? twin.athleteId, twin))
    );
    return {
      generatedAt: new Date().toISOString(),
      athleteCount: reports.length,
      // RPT-002 (#198): team-level rollup so a coach gets operational support, not
      // just a list of individual reports.
      aggregate: aggregateTeamReports(reports),
      reports,
    };
  }
}

export interface TeamReportAggregate {
  averageReadiness: number | null;
  readinessZones: Record<string, number>;
  recoveryStatuses: Record<string, number>;
  injuryRiskLevels: Record<string, number>;
  // Athletes needing coach attention: high injury risk or under-recovered.
  flaggedAthleteIds: string[];
}

// Pure rollup over per-athlete reports. Distributions + average readiness +
// a flagged list, derived only from values already in each report (no extra data
// dependency, no fabrication).
export function aggregateTeamReports(reports: AthleteReport[]): TeamReportAggregate {
  const readinessZones: Record<string, number> = {};
  const recoveryStatuses: Record<string, number> = {};
  const injuryRiskLevels: Record<string, number> = {};
  const flaggedAthleteIds: string[] = [];
  let scoreSum = 0;
  let scoreCount = 0;

  const tally = (bucket: Record<string, number>, key: string) => {
    if (key) bucket[key] = (bucket[key] ?? 0) + 1;
  };

  for (const report of reports) {
    const zone = String(report.keyMetrics["Readiness Zone"] ?? "");
    const status = String(report.keyMetrics["Recovery Status"] ?? "");
    const risk = String(report.keyMetrics["Injury Risk Level"] ?? "");
    tally(readinessZones, zone);
    tally(recoveryStatuses, status);
    tally(injuryRiskLevels, risk);

    const score = report.keyMetrics["Readiness Score"];
    if (typeof score === "number") {
      scoreSum += score;
      scoreCount += 1;
    }

    if (risk === "high" || status === "under_recovered") {
      flaggedAthleteIds.push(report.athleteId);
    }
  }

  return {
    averageReadiness: scoreCount ? Math.round((scoreSum / scoreCount) * 10) / 10 : null,
    readinessZones,
    recoveryStatuses,
    injuryRiskLevels,
    flaggedAthleteIds,
  };
}

export const reportingService = new ReportingService();
