import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import type { AthleteIqCheckInFieldKey, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

const LIFESTYLE_FIELDS: AthleteIqCheckInFieldKey[] = ["sleepQuality", "fatigue", "pain", "stress", "mood"];

export type PersistedAthleteIqCheckIn = {
  snapshot: AthleteIqCheckInSnapshot;
  sharedDailySnapshot: AthleteIqCheckInSnapshot;
};

export async function upsertAthleteIqCheckInWithSharedDailyMirror(snapshot: AthleteIqCheckInSnapshot): Promise<PersistedAthleteIqCheckIn> {
  if (snapshot.mode === "lifestyle") {
    const saved = await upsertAthleteIqCheckInSnapshot(snapshot);
    return { snapshot: saved, sharedDailySnapshot: saved };
  }

  const mirror = buildLifestyleMirror(snapshot);
  const [savedSnapshot, savedSharedDailySnapshot] = await Promise.all([
    upsertAthleteIqCheckInSnapshot(snapshot),
    upsertAthleteIqCheckInSnapshot(mirror)
  ]);

  return { snapshot: savedSnapshot, sharedDailySnapshot: savedSharedDailySnapshot };
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
