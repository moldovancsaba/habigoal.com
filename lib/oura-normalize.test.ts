import { describe, expect, it } from "vitest";
import { normalizeOuraPayloads, OURA_NORMALISATION_VERSION } from "@/lib/oura-normalize";
import type { RawPayload } from "@/types/canonical-metric";

const conn = { athleteId: "a1", organisationId: "org1" };
const now = new Date("2026-06-28T12:00:00.000Z");

function raw(payload: Record<string, unknown>, payloadId = "p"): RawPayload {
  return { payloadId, athleteId: "a1", source: "oura", receivedAt: now.toISOString(), payload, normalised: false };
}

describe("normalizeOuraPayloads", () => {
  it("maps a sleep payload to canonical metrics with correct units and conversion", () => {
    const metrics = normalizeOuraPayloads(
      [raw({ ouraType: "sleep", day: "2026-06-28", total_sleep_duration: 27000, efficiency: 91, average_hrv: 65, lowest_heart_rate: 48 })],
      conn,
      now
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.sleep_duration_minutes.value).toBe(450); // 27000s / 60
    expect(byKey.sleep_duration_minutes.unit).toBe("minutes");
    expect(byKey.sleep_efficiency_percentage.value).toBe(91);
    expect(byKey.hrv_rmssd_ms.value).toBe(65);
    expect(byKey.resting_heart_rate_bpm.value).toBe(48);
    expect(metrics.every((m) => m.source === "oura" && m.normalisationVersion === OURA_NORMALISATION_VERSION)).toBe(true);
  });

  it("maps daily_sleep and daily_readiness scores", () => {
    const metrics = normalizeOuraPayloads(
      [raw({ ouraType: "daily_sleep", day: "2026-06-28", score: 82 }, "s"), raw({ ouraType: "daily_readiness", day: "2026-06-28", score: 77 }, "r")],
      conn,
      now
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.sleep_quality_score.value).toBe(82);
    expect(byKey.energy_score.value).toBe(77);
  });

  it("produces a deterministic metricId (idempotent re-sync)", () => {
    const [m] = normalizeOuraPayloads([raw({ ouraType: "daily_sleep", day: "2026-06-28", score: 82 })], conn, now);
    expect(m.metricId).toBe("a1:2026-06-28:oura:sleep_quality_score");
  });

  it("skips unknown resource types, missing days, and non-numeric fields", () => {
    expect(normalizeOuraPayloads([raw({ ouraType: "spo2", day: "2026-06-28", value: 97 })], conn, now)).toHaveLength(0);
    expect(normalizeOuraPayloads([raw({ ouraType: "daily_sleep", score: 82 })], conn, now)).toHaveLength(0);
    expect(normalizeOuraPayloads([raw({ ouraType: "daily_sleep", day: "2026-06-28", score: "high" })], conn, now)).toHaveLength(0);
  });
});
