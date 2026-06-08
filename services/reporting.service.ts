import { AthleteTwin } from "../types/athlete-twin";
import { buildRecommendation } from "@/lib/engines/recommendation.engine";
import { computeReadiness } from "@/lib/engines/readiness.engine";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { getChildById } from "@/repositories/child.repository";
import { ObjectId } from "mongodb";

export interface AthleteReport {
  athleteId: string;
  reportDate: string;
  dateRange: { from: string; to: string };
  summary: string;
  keyMetrics: Record<string, number | string>;
  coachNotes: string[];
  aiCommentary: string;
  aiGenerated: boolean;
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

    const context = { athleteId, twin, organisationId: twin.organisationId };
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
      aiCommentary: `[AI Generated — ${recommendation.modelVersion}] ${recommendation.text}\n\nReason: ${recommendation.reason}\n\n${recommendation.advisoryDisclaimer}`,
      aiGenerated: true,
      sourceDataNotes: [
        `Twin version ${twin.twinVersion}`,
        `Recovery sources: ${(twin.recovery?.sources || []).join(", ") || "none"}`,
        `Performance sources: ${(twin.performance?.sources || []).join(", ") || "none"}`,
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
      reports,
    };
  }
}

export const reportingService = new ReportingService();
