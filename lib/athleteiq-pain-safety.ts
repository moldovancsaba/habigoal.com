import type { AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";
import type { PainAlertRecord, PainAlertState, PainGuardrail, PainRiskLevel, PainSafetyEvaluationInput } from "@/types/athleteiq-pain-safety";

export const ATHLETEIQ_PAIN_SAFETY_CAPABILITY_KEY = "AIQ-1240";
export const ATHLETEIQ_PAIN_SAFETY_ALGORITHM_VERSION = "aiq-pain-safety-1240.1";
export const PAIN_RECURRENCE_WINDOW_DAYS = 3;

export function evaluatePainSafety(input: PainSafetyEvaluationInput, now = new Date()): { guardrail: PainGuardrail; alert?: Omit<PainAlertRecord, "id"> } {
  const today = input.recentPainScores.find((entry) => entry.localDate === input.localDate) ?? null;
  const painScore = today?.painScore ?? null;
  const recurringPainDays = input.recentPainScores.filter((entry) => typeof entry.painScore === "number" && entry.painScore >= 5).length;
  const state = getPainAlertState(painScore, recurringPainDays);
  const riskLevel = getPainRiskLevel(state);
  const reasonCodes = getReasonCodes(painScore, recurringPainDays);
  const dailyIqCap = state === "capped" || state === "coach_review" ? 60 : null;
  const guardrail: PainGuardrail = {
    athleteId: input.athleteId,
    localDate: input.localDate,
    state,
    riskLevel,
    maxTrainingIntensity: getMaxTrainingIntensity(state),
    dailyIqCap,
    requiredCopyKey: getCopyKey(state),
    coachAlertId: input.existingAlertId,
    reasonCodes,
    dataUsed: today ? ["daily_check_ins"] : [],
    missingData: today ? [] : ["pain"],
    generatedAt: now.toISOString()
  };

  if (state === "none") return { guardrail };
  const timestamp = now.toISOString();
  return {
    guardrail,
    alert: {
      athleteId: input.athleteId,
      localDate: input.localDate,
      state,
      riskLevel,
      painScore,
      locations: today?.locations ?? [],
      reasonCodes,
      requiredCopyKey: guardrail.requiredCopyKey,
      auditHistory: [`created:${timestamp}`],
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
}

export function getPainAlertState(painScore: number | null, recurringPainDays: number): PainAlertState {
  if (recurringPainDays >= 3) return "coach_review";
  if (typeof painScore !== "number") return "monitor";
  if (painScore <= 3) return "none";
  if (painScore >= 7) return "capped";
  return "monitor";
}

export function getPainSignalFromCheckIn(snapshot: AthleteIqCheckInSnapshot) {
  const painValue = snapshot.values.pain?.rawValue;
  const soreness = snapshot.values.sorenessAreas?.rawValue;
  const trainingLoad = snapshot.values.trainingLoad?.rawValue;
  return {
    localDate: snapshot.localDate,
    painScore: typeof painValue === "number" ? painValue : null,
    locations: Array.isArray(soreness) ? soreness.filter((value): value is string => typeof value === "string") : [],
    sessionLoadContext: typeof trainingLoad === "number" ? trainingLoad : null
  };
}

function getPainRiskLevel(state: PainAlertState): PainRiskLevel {
  if (state === "coach_review") return "recurring";
  if (state === "capped") return "high";
  if (state === "monitor") return "moderate";
  return "none";
}

function getMaxTrainingIntensity(state: PainAlertState) {
  if (state === "coach_review" || state === "capped") return "recovery";
  if (state === "monitor") return "low";
  return "normal";
}

function getCopyKey(state: PainAlertState) {
  if (state === "coach_review") return "athleteiq.painSafety.copy.coachReview";
  if (state === "capped") return "athleteiq.painSafety.copy.recoveryOnly";
  if (state === "monitor") return "athleteiq.painSafety.copy.monitor";
  return "athleteiq.painSafety.copy.none";
}

function getReasonCodes(painScore: number | null, recurringPainDays: number) {
  const reasons: string[] = [];
  if (typeof painScore !== "number") reasons.push("missing_pain");
  if (typeof painScore === "number" && painScore >= 7) reasons.push("high_pain_today");
  if (typeof painScore === "number" && painScore >= 4 && painScore <= 6) reasons.push("monitor_pain_today");
  if (recurringPainDays >= 3) reasons.push("pain_repeated_three_days");
  return reasons;
}
