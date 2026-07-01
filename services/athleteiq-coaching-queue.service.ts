// Coach coaching-queue service (P0 #525). Runs the readiness/recovery/injury
// engines + recommendation engine per athlete and assembles a triage-ordered
// queue for the trainer. Reuses the same orchestration as the twin pipeline, so
// what the coach sees matches what the twin records — no separate heuristic.

import { ObjectId } from "mongodb";
import { computeReadiness } from "@/lib/engines/readiness.engine";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { buildRecommendation } from "@/lib/engines/recommendation.engine";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { getLatestFms } from "@/services/athleteiq-fms.service";
import { getChildById } from "@/repositories/child.repository";
import type { AthleteTwin } from "@/types/athlete-twin";
import type { FmsScreen } from "@/types/athleteiq-fms";
import type { CoachingQueueEntry } from "@/types/athleteiq-coaching-queue";

const RISK_WEIGHT: Record<CoachingQueueEntry["injuryRisk"]["riskLevel"], number> = {
  high: 100,
  elevated: 50,
  low: 0,
};

// Lower engine confidence on a risk signal deserves *more* coach attention, not
// less — an uncertain "high risk" still needs a human look.
const CONFIDENCE_ATTENTION: Record<string, number> = { low: 8, medium: 4, high: 0 };

// Pure assembler — takes a twin (+ optional FMS/birthDate) and produces the
// coaching-queue entry by running the engines. Exported for unit testing without
// a database.
export async function computeCoachingQueueEntry(
  athleteId: string,
  twin: AthleteTwin,
  latestFms: FmsScreen | null = null,
  birthDate?: string
): Promise<CoachingQueueEntry> {
  const context = { athleteId, twin, organisationId: "default", latestFms };
  const [readiness, recovery, injuryRisk] = await Promise.all([
    computeReadiness(context),
    computeRecovery(context),
    computeInjuryRisk(context),
  ]);
  const recommendation = buildRecommendation(twin, readiness, recovery, injuryRisk, birthDate);

  const urgency =
    RISK_WEIGHT[injuryRisk.result.riskLevel] +
    (recommendation.humanReviewRequired ? 20 : 0) +
    (recommendation.delivery === "awaiting_review" ? 10 : 0) +
    (CONFIDENCE_ATTENTION[recommendation.confidence] ?? 0) +
    (5 - readiness.result.score / 20); // lower readiness → slightly higher urgency

  return {
    athleteId,
    readiness: {
      score: readiness.result.score,
      zone: readiness.result.zone,
      clearedForHighIntensity: readiness.result.clearedForHighIntensity,
    },
    recommendation: {
      text: recommendation.text,
      textKey: recommendation.textKey,
      reason: recommendation.reason,
      confidence: recommendation.confidence,
      humanReviewRequired: recommendation.humanReviewRequired,
      delivery: recommendation.delivery,
    },
    injuryRisk: {
      riskLevel: injuryRisk.result.riskLevel,
      flags: injuryRisk.result.flags,
      loadReductionRecommended: injuryRisk.result.loadReductionRecommended,
      confidence: injuryRisk.confidence,
    },
    urgency: Math.round(urgency * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}

// Build the full coaching queue for a set of athletes (typically a team roster).
// Athletes without a twin (no check-in history yet) are skipped — nothing is
// fabricated. Sorted most-urgent first, deterministic tiebreak by athleteId.
export async function getCoachCoachingQueue(input: {
  athleteIds: string[];
}): Promise<CoachingQueueEntry[]> {
  const entries: CoachingQueueEntry[] = [];
  for (const athleteId of input.athleteIds) {
    const twin = await findTwinByAthleteId(athleteId);
    if (!twin) continue;
    const latestFms = await getLatestFms(athleteId);
    const child = ObjectId.isValid(athleteId) ? await getChildById(new ObjectId(athleteId)) : null;
    entries.push(await computeCoachingQueueEntry(athleteId, twin, latestFms, child?.birthDate));
  }
  return entries.sort((a, b) => b.urgency - a.urgency || a.athleteId.localeCompare(b.athleteId));
}
