import { CanonicalMetric } from "../types/canonical-metric";
import {
  AthleteTwin,
  TwinDimensionSnapshot,
  RecoveryDimension,
  PerformanceDimension,
  PhysicalDimension,
  CognitiveDimension,
  TechnicalDimension,
  TwinHistoryEntry,
} from "../types/athlete-twin";
import { EngineOutput, InjuryRiskResult, ReadinessResult, RecommendationResult, RecoveryResult } from "../types/ai-engine";
import { findTwinByAthleteId, upsertTwin } from "../repositories/athlete-twin.repository";
import { globalEventBus } from "./events/event-bus";

export function createEmptyTwin(athleteId: string, organisationId: string): AthleteTwin {
  const emptySnapshot: TwinDimensionSnapshot = {
    updatedAt: new Date().toISOString(),
    sources: [],
    confidence: "low",
  };

  return {
    athleteId,
    organisationId,
    twinVersion: 0,
    schemaVersion: "1.0.0",
    lastUpdatedAt: new Date().toISOString(),
    physical: { ...emptySnapshot },
    performance: { ...emptySnapshot },
    technical: { ...emptySnapshot },
    recovery: { ...emptySnapshot },
    cognitive: { ...emptySnapshot },
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateRecoveryDimension(
  existing: RecoveryDimension,
  metrics: CanonicalMetric[],
  date: string
): RecoveryDimension {
  const updated = { ...existing };
  updated.updatedAt = date;
  
  const sources = new Set(existing.sources || []);

  for (const m of metrics) {
    sources.add(m.source);
    switch (m.canonicalKey) {
      case "sleep_quality_score":
        updated.sleepQualityScore7d = m.value; // Simplification: replacing with latest
        break;
      case "sleep_duration_minutes":
        updated.sleepDurationMin7d = m.value;
        break;
      case "mood_score":
        updated.moodScore7d = m.value;
        break;
      case "stress_score":
        updated.stressScore7d = m.value;
        break;
      case "soreness_score":
        updated.sorenessScore7d = m.value;
        break;
      case "energy_score":
        updated.energyScore7d = m.value;
        break;
    }
  }

  updated.sources = Array.from(sources);
  updated.confidence = updated.sources.length > 1 ? "medium" : "low";

  return updated;
}

export function updatePerformanceDimension(
  existing: PerformanceDimension,
  metrics: CanonicalMetric[],
  date: string
): PerformanceDimension {
  const updated = { ...existing };
  updated.updatedAt = date;
  
  const sources = new Set(existing.sources || []);

  for (const m of metrics) {
    sources.add(m.source);
    switch (m.canonicalKey) {
      case "internal_load_points":
        updated.internalLoadPoints7d = m.value; // For true 7d we'd aggregate history, simplifying here
        updated.acuteLoad7d = (updated.acuteLoad7d || 0) + m.value;
        // Naive ACWR calculation for demonstration
        if (updated.chronicLoad28d && updated.chronicLoad28d > 0) {
          updated.acwr = updated.acuteLoad7d / updated.chronicLoad28d;
        } else {
          updated.acwr = updated.acuteLoad7d / (updated.acuteLoad7d || 1); // fallback
        }
        break;
      case "external_load_points":
        updated.externalLoadPoints7d = m.value;
        break;
    }
  }

  updated.sources = Array.from(sources);
  updated.confidence = updated.sources.length > 0 ? "medium" : "low";

  return updated;
}

export function appendHistory(
  history: TwinHistoryEntry[],
  date: string,
  twin: AthleteTwin
): TwinHistoryEntry[] {
  const newEntries: TwinHistoryEntry[] = [
    { date, dimension: "recovery", snapshot: twin.recovery as unknown as Record<string, number> },
    { date, dimension: "performance", snapshot: twin.performance as unknown as Record<string, number> }
  ];

  const combined = [...history, ...newEntries];
  
  // Sort descending and keep last 90
  combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return combined.slice(0, 90);
}

export async function updateTwinFromMetrics(
  athleteId: string,
  organisationId: string,
  date: string,
  metrics: CanonicalMetric[]
): Promise<void> {
  const existing = (await findTwinByAthleteId(athleteId)) ?? createEmptyTwin(athleteId, organisationId);
  const updated = { ...existing };

  const recoveryKeys = [
    "mood_score", "energy_score", "stress_score", "soreness_score",
    "sleep_quality_score", "sleep_duration_minutes"
  ];
  const performanceKeys = [
    "internal_load_points", "external_load_points", "session_rpe", "session_duration_minutes"
  ];
  const physicalKeys = [
    "resting_heart_rate_bpm", "hrv_rmssd_ms", "peak_force_newtons", "jump_height_cm", "left_right_asymmetry_percentage"
  ];
  const cognitiveKeys = ["reaction_time_ms", "mood_score", "stress_score"];

  const recoveryMetrics = metrics.filter(m => recoveryKeys.includes(m.canonicalKey));
  const performanceMetrics = metrics.filter(m => performanceKeys.includes(m.canonicalKey));
  const physicalMetrics = metrics.filter(m => physicalKeys.includes(m.canonicalKey));
  const cognitiveMetrics = metrics.filter(m => cognitiveKeys.includes(m.canonicalKey));

  if (recoveryMetrics.length > 0) {
    updated.recovery = updateRecoveryDimension(existing.recovery, recoveryMetrics, date);
  }

  if (performanceMetrics.length > 0) {
    updated.performance = updatePerformanceDimension(existing.performance, performanceMetrics, date);
  }

  if (physicalMetrics.length > 0) {
    updated.physical = updatePhysicalDimension(existing.physical, physicalMetrics, date);
  }

  if (cognitiveMetrics.length > 0) {
    updated.cognitive = updateCognitiveDimension(existing.cognitive, cognitiveMetrics, date);
  }

  updated.history = appendHistory(updated.history, date, updated);
  updated.twinVersion = (existing.twinVersion ?? 0) + 1;
  updated.lastUpdatedAt = new Date().toISOString();

  await upsertTwin(updated);

  await globalEventBus.publish({
    type: "TWIN_UPDATED",
    payload: { athleteId, organisationId, source: "metrics" },
    timestamp: new Date().toISOString(),
  });
}

export function updatePhysicalDimension(
  existing: PhysicalDimension,
  metrics: CanonicalMetric[],
  date: string
): PhysicalDimension {
  const updated = { ...existing, updatedAt: date };
  const sources = new Set(existing.sources || []);
  for (const m of metrics) {
    sources.add(m.source);
    switch (m.canonicalKey) {
      case "resting_heart_rate_bpm":
        updated.restingHeartRateBpm = m.value;
        break;
      case "hrv_rmssd_ms":
        updated.hrvRmssdMs = m.value;
        break;
      case "peak_force_newtons":
        updated.peakForceNewtons = m.value;
        break;
      case "jump_height_cm":
        updated.jumpHeightCm = m.value;
        break;
      case "left_right_asymmetry_percentage":
        updated.leftRightAsymmetryPct = m.value;
        break;
    }
  }
  updated.sources = Array.from(sources);
  updated.confidence = updated.sources.length > 1 ? "medium" : "low";
  return updated;
}

export function updateCognitiveDimension(
  existing: CognitiveDimension,
  metrics: CanonicalMetric[],
  date: string
): CognitiveDimension {
  const updated = { ...existing, updatedAt: date };
  const sources = new Set(existing.sources || []);
  for (const m of metrics) {
    sources.add(m.source);
    if (m.canonicalKey === "reaction_time_ms") updated.reactionTimeMs = m.value;
    if (m.canonicalKey === "mood_score") updated.moodTrend7d = m.value;
    if (m.canonicalKey === "stress_score") updated.stressTrend7d = m.value;
  }
  updated.sources = Array.from(sources);
  updated.confidence = updated.sources.length > 0 ? "medium" : "low";
  return updated;
}

export function updateTechnicalFromVision(
  existing: TechnicalDimension,
  input: { symmetryIndex?: number; formScore?: number; confidence?: "high" | "medium" | "low" },
  date: string
): TechnicalDimension {
  return {
    ...existing,
    updatedAt: date,
    movementSymmetryIndex: input.symmetryIndex ?? existing.movementSymmetryIndex,
    runningFormScore: input.formScore ?? existing.runningFormScore,
    confidence: input.confidence ?? existing.confidence,
    sources: Array.from(new Set([...(existing.sources || []), "ai_inference"])),
  };
}

export async function updateTwinFromEngineOutputs(
  athleteId: string,
  organisationId: string,
  outputs: {
    readiness: EngineOutput<ReadinessResult>;
    recovery: EngineOutput<RecoveryResult>;
    injuryRisk: EngineOutput<InjuryRiskResult>;
    recommendation: RecommendationResult;
  }
): Promise<void> {
  const existing = (await findTwinByAthleteId(athleteId)) ?? createEmptyTwin(athleteId, organisationId);
  const updated = { ...existing };

  updated.recovery = {
    ...updated.recovery,
    recoveryReadinessScore: outputs.readiness.result.score,
    updatedAt: new Date().toISOString(),
    confidence: outputs.readiness.confidence,
    sources: Array.from(new Set([...(updated.recovery.sources || []), "ai_inference"])),
  };

  updated.performance = {
    ...updated.performance,
    updatedAt: new Date().toISOString(),
    confidence: outputs.injuryRisk.confidence,
  };

  updated.cognitive = {
    ...updated.cognitive,
    updatedAt: new Date().toISOString(),
    stressTrend7d: outputs.recovery.result.status === "under_recovered" ? 8 : updated.cognitive.stressTrend7d,
  };

  updated.twinVersion = (existing.twinVersion ?? 0) + 1;
  updated.lastUpdatedAt = new Date().toISOString();
  await upsertTwin(updated);
}
