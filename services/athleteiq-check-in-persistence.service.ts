import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { getAthleteIqCheckInSnapshot, upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import type { AthleteIqCheckInFieldKey, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

const LIFESTYLE_FIELDS: AthleteIqCheckInFieldKey[] = ["sleepQuality", "fatigue", "pain", "stress", "mood"];

export type PersistedAthleteIqCheckIn = {
  professionalSnapshot: AthleteIqCheckInSnapshot;
  snapshot: AthleteIqCheckInSnapshot;
  sharedDailySnapshot: AthleteIqCheckInSnapshot;
};

export async function upsertAthleteIqCheckInWithSharedDailyMirror(snapshot: AthleteIqCheckInSnapshot): Promise<PersistedAthleteIqCheckIn> {
  if (snapshot.mode === "lifestyle") {
    const existingPerformanceSnapshot = await getAthleteIqCheckInSnapshot(snapshot.athleteId, snapshot.localDate, "performance");
    const performanceMirror = buildPerformanceMirror(snapshot, existingPerformanceSnapshot);
    const [savedSnapshot, savedProfessionalSnapshot] = await Promise.all([
      upsertAthleteIqCheckInSnapshot(snapshot),
      upsertAthleteIqCheckInSnapshot(performanceMirror)
    ]);
    return {
      professionalSnapshot: savedProfessionalSnapshot,
      snapshot: savedSnapshot,
      sharedDailySnapshot: savedSnapshot
    };
  }

  const mirror = buildLifestyleMirror(snapshot);
  const [savedSnapshot, savedSharedDailySnapshot] = await Promise.all([
    upsertAthleteIqCheckInSnapshot(snapshot),
    upsertAthleteIqCheckInSnapshot(mirror)
  ]);

  return {
    professionalSnapshot: savedSnapshot,
    snapshot: savedSnapshot,
    sharedDailySnapshot: savedSharedDailySnapshot
  };
}

export function buildLifestyleMirror(snapshot: AthleteIqCheckInSnapshot): AthleteIqCheckInSnapshot {
  const values: Record<string, unknown> = {};
  for (const field of LIFESTYLE_FIELDS) {
    values[field] = snapshot.values[field]?.rawValue;
  }

  const note = snapshot.values.note?.rawValue;
  if (typeof note === "string" && note.trim()) {
    values.note = note;
  }

  const result = buildAthleteIqCheckInSnapshot({
    athleteId: snapshot.athleteId,
    idempotencyKey: snapshot.idempotencyKey ? `${snapshot.idempotencyKey}:lifestyle` : `${snapshot.athleteId}:${snapshot.localDate}:shared-lifestyle`,
    mode: "lifestyle",
    timezone: snapshot.timezone,
    values
  });

  if (!result.snapshot) {
    throw new Error(`Unable to mirror Athlete IQ check-in to shared lifestyle state: ${result.errors.join(", ")}`);
  }

  return {
    ...result.snapshot,
    localDate: snapshot.localDate,
    auditHistory: [
      ...result.snapshot.auditHistory,
      `shared-daily-mirror:${snapshot.mode}:${snapshot.idempotencyKey || snapshot.athleteId}:${new Date().toISOString()}`
    ]
  };
}

export function buildPerformanceMirror(
  snapshot: AthleteIqCheckInSnapshot,
  existingPerformanceSnapshot?: AthleteIqCheckInSnapshot | null
): AthleteIqCheckInSnapshot {
  const values = rawValuesFromSnapshot(existingPerformanceSnapshot);
  for (const field of LIFESTYLE_FIELDS) {
    values[field] = snapshot.values[field]?.rawValue;
  }

  const note = snapshot.values.note?.rawValue;
  if (typeof note === "string" && note.trim()) {
    values.note = note;
  }

  const result = buildAthleteIqCheckInSnapshot({
    athleteId: snapshot.athleteId,
    idempotencyKey: snapshot.idempotencyKey ? `${snapshot.idempotencyKey}:performance` : `${snapshot.athleteId}:${snapshot.localDate}:shared-performance`,
    mode: "performance",
    timezone: snapshot.timezone,
    values
  });

  if (!result.snapshot) {
    throw new Error(`Unable to mirror shared daily check-in to Athlete IQ performance state: ${result.errors.join(", ")}`);
  }

  return {
    ...result.snapshot,
    localDate: snapshot.localDate,
    auditHistory: [
      ...result.snapshot.auditHistory,
      `shared-performance-mirror:${snapshot.mode}:${snapshot.idempotencyKey || snapshot.athleteId}:${new Date().toISOString()}`
    ]
  };
}

function rawValuesFromSnapshot(snapshot?: AthleteIqCheckInSnapshot | null) {
  const values: Record<string, unknown> = {};
  if (!snapshot) return values;
  for (const [key, value] of Object.entries(snapshot.values)) {
    if (value?.rawValue !== undefined && value.rawValue !== null && value.rawValue !== "") {
      values[key] = value.rawValue;
    }
  }
  return values;
}
