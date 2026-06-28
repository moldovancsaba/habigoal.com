import { describe, expect, it } from "vitest";
import { normalizeGarminPayloads, GARMIN_NORMALISATION_VERSION } from "@/lib/garmin-normalize";
import type { RawPayload } from "@/types/canonical-metric";

const conn = { athleteId: "a1", organisationId: "org1" };
const now = new Date("2026-06-28T12:00:00.000Z");

function raw(payload: Record<string, unknown>, payloadId = "p"): RawPayload {
  return { payloadId, athleteId: "a1", source: "garmin", receivedAt: now.toISOString(), payload, normalised: false };
}

describe("normalizeGarminPayloads", () => {
  it("maps dailies fields (RHR, stress, body battery)", () => {
    const metrics = normalizeGarminPayloads(
      [raw({ garminType: "dailies", day: "2026-06-28", restingHeartRateInBeatsPerMinute: 50, averageStressLevel: 32, bodyBatteryHighestValue: 78 })],
      conn,
      now
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.resting_heart_rate_bpm.value).toBe(50);
    expect(byKey.stress_score.value).toBe(32);
    expect(byKey.energy_score.value).toBe(78);
    expect(metrics.every((m) => m.source === "garmin" && m.normalisationVersion === GARMIN_NORMALISATION_VERSION)).toBe(true);
  });

  it("maps hrv and sleep (with seconds→minutes conversion)", () => {
    const metrics = normalizeGarminPayloads(
      [raw({ garminType: "hrv", day: "2026-06-28", lastNightAvgHrvInMs: 58 }, "h"), raw({ garminType: "sleep", day: "2026-06-28", durationInSeconds: 27000, sleepScore: 84 }, "s")],
      conn,
      now
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.hrv_rmssd_ms.value).toBe(58);
    expect(byKey.sleep_duration_minutes.value).toBe(450);
    expect(byKey.sleep_quality_score.value).toBe(84);
  });

  it("produces a deterministic metricId and skips unknown/empty payloads", () => {
    const [m] = normalizeGarminPayloads([raw({ garminType: "hrv", day: "2026-06-28", lastNightAvgHrvInMs: 58 })], conn, now);
    expect(m.metricId).toBe("a1:2026-06-28:garmin:hrv_rmssd_ms");
    expect(normalizeGarminPayloads([raw({ garminType: "spo2", day: "2026-06-28", value: 97 })], conn, now)).toHaveLength(0);
    expect(normalizeGarminPayloads([raw({ garminType: "hrv", lastNightAvgHrvInMs: 58 })], conn, now)).toHaveLength(0);
  });
});
