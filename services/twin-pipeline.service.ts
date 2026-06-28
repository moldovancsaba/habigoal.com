import { getChildById } from "@/repositories/child.repository";
import { findAssessmentByChildAndDate } from "@/repositories/assessment.repository";
import { getGlobalSettings } from "@/repositories/settings.repository";
import { upsertManyCanonicalMetrics } from "@/repositories/canonical-metric.repository";
import { normaliseCheckinToMetrics } from "@/lib/normalise-metric";
import { updateTwinFromMetrics, updateTwinFromEngineOutputs } from "@/lib/twin-updater";
import { resolveCheckInConfig } from "@/lib/check-in-config";
import { computeReadiness } from "@/lib/engines/readiness.engine";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { getLatestFms } from "@/services/athleteiq-fms.service";
import { buildRecommendation } from "@/lib/engines/recommendation.engine";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { globalEventBus } from "@/lib/events/event-bus";
import { enqueueJob } from "@/repositories/queue.repository";
import { upsertCoachAction } from "@/repositories/coach-actions.repository";
import { ensurePlatformInitialised } from "@/lib/platform-init";
import type { AssessmentRecord } from "@/types/assessment";
import { ObjectId } from "mongodb";

export class DuplicateCheckInError extends Error {
  code = "DUPLICATE_CHECKIN";
  constructor(date: string) {
    super(`Check-in already exists for ${date}`);
    this.name = "DuplicateCheckInError";
  }
}

export async function assertCheckInAllowed(
  athleteId: string,
  date: string,
  staffOverride = false
): Promise<void> {
  const settings = await getGlobalSettings();
  const config = resolveCheckInConfig(settings);
  const existing = await findAssessmentByChildAndDate(athleteId, date);
  if (existing && !(staffOverride && config.allowDuplicateOverride)) {
    throw new DuplicateCheckInError(date);
  }
}

export async function processCheckInToTwin(
  assessment: AssessmentRecord,
  organisationId = "default"
): Promise<void> {
  ensurePlatformInitialised();
  const athleteId = assessment.childId!;
  if (!athleteId) return;

  const metrics = normaliseCheckinToMetrics(athleteId, organisationId, assessment);
  if (metrics.length > 0) {
    await upsertManyCanonicalMetrics(metrics);
    await updateTwinFromMetrics(athleteId, organisationId, assessment.session.date, metrics);
  }

  const twin = (await findTwinByAthleteId(athleteId))!;
  if (!twin) return;

  const latestFms = await getLatestFms(athleteId);
  const context = { athleteId, twin, organisationId, latestFms };
  const [readiness, recovery, injuryRisk] = await Promise.all([
    computeReadiness(context),
    computeRecovery(context),
    computeInjuryRisk(context),
  ]);

  const child = ObjectId.isValid(athleteId) ? await getChildById(new ObjectId(athleteId)) : null;
  const birthDate = child?.birthDate ?? assessment.child.birthDate;
  const recommendation = buildRecommendation(twin, readiness, recovery, injuryRisk, birthDate);

  await updateTwinFromEngineOutputs(athleteId, organisationId, {
    readiness,
    recovery,
    injuryRisk,
    recommendation,
  });

  if (recommendation.humanReviewRequired) {
    await upsertCoachAction({
      athleteKey: athleteId,
      date: assessment.session.date,
      recommendationKey: "human-review-required",
      status: "open",
      severity: recommendation.confidence === "low" ? "critical" : "warning",
      sourceType: "recommendation",
      sourceId: assessment._id?.toString(),
      detail: recommendation.text,
      actorName: "Habigoal System",
      actorEmail: "system@habigoal.local",
    });
  }

  await globalEventBus.publish({
    type: "TWIN_UPDATED",
    payload: { athleteId, organisationId, source: "check_in" },
    timestamp: new Date().toISOString(),
  });

  await enqueueJob({
    jobId: crypto.randomUUID(),
    type: "generate_ai_insight",
    priority: 50,
    payload: { athleteId, organisationId, source: "check_in" },
    maxAttempts: 3,
    runAfter: new Date().toISOString(),
  });
}
