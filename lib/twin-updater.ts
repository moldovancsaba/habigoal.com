import { CanonicalMetric } from "../types/canonical-metric";
import {
  AthleteTwin,
  TwinDimensionSnapshot,
  RecoveryDimension,
  PerformanceDimension,
  TwinHistoryEntry,
} from "../types/athlete-twin";
import { findTwinByAthleteId, upsertTwin } from "../repositories/athlete-twin.repository";

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

  const recoveryMetrics = metrics.filter(m => recoveryKeys.includes(m.canonicalKey));
  const performanceMetrics = metrics.filter(m => performanceKeys.includes(m.canonicalKey));

  if (recoveryMetrics.length > 0) {
    updated.recovery = updateRecoveryDimension(existing.recovery, recoveryMetrics, date);
  }

  if (performanceMetrics.length > 0) {
    updated.performance = updatePerformanceDimension(existing.performance, performanceMetrics, date);
  }

  updated.history = appendHistory(updated.history, date, updated);
  updated.twinVersion = (existing.twinVersion ?? 0) + 1;
  updated.lastUpdatedAt = new Date().toISOString();

  await upsertTwin(updated);
}
