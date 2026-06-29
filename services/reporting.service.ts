import { AthleteTwin } from "../types/athlete-twin";
import { buildRecommendation } from "@/lib/engines/recommendation.engine";
import { computeReadiness } from "@/lib/engines/readiness.engine";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { getChildById } from "@/repositories/child.repository";
import { getLatestFms } from "@/services/athleteiq-fms.service";
import { ObjectId } from "mongodb";

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

    return {
      athleteId,
      reportDate: new Date().toISOString(),
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
      sourceDataNotes: [
        `Recovery data: ${(twin.recovery?.sources || []).join(", ") || "none"}`,
        `Performance data: ${(twin.performance?.sources || []).join(", ") || "none"}`,
        `Confidence: ${recommendation.confidence}`,
      ],
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
