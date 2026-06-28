import { describe, expect, it } from "vitest";
import { normalizeWhoopPayloads, WHOOP_NORMALISATION_VERSION } from "@/lib/whoop-normalize";
import type { RawPayload } from "@/types/canonical-metric";

const conn = { athleteId: "a1", organisationId: "org1" };
const now = new Date("2026-06-28T12:00:00.000Z");

function raw(payload: Record<string, unknown>, payloadId = "p"): RawPayload {
  return { payloadId, athleteId: "a1", source: "whoop", receivedAt: now.toISOString(), payload, normalised: false };
}

describe("normalizeWhoopPayloads", () => {
  it("maps recovery fields to canonical metrics", () => {
    const metrics = normalizeWhoopPayloads(
      [raw({ whoopType: "recovery", day: "2026-06-28", recovery_score: 66, resting_heart_rate: 52, hrv_rmssd_milli: 71 })],
      conn,
      now
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.energy_score.value).toBe(66);
    expect(byKey.resting_heart_rate_bpm.value).toBe(52);
    expect(byKey.hrv_rmssd_ms.value).toBe(71);
    expect(metrics.every((m) => m.source === "whoop" && m.normalisationVersion === WHOOP_NORMALISATION_VERSION)).toBe(true);
  });

  it("maps sleep fields to canonical metrics", () => {
    const metrics = normalizeWhoopPayloads(
      [raw({ whoopType: "sleep", day: "2026-06-28", sleep_performance_percentage: 88, total_sleep_minutes: 445 })],
      conn,
      now
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.sleep_quality_score.value).toBe(88);
    expect(byKey.sleep_duration_minutes.value).toBe(445);
  });

  it("produces a deterministic metricId and skips unknown/empty payloads", () => {
    const [m] = normalizeWhoopPayloads([raw({ whoopType: "recovery", day: "2026-06-28", recovery_score: 66 })], conn, now);
    expect(m.metricId).toBe("a1:2026-06-28:whoop:energy_score");
    expect(normalizeWhoopPayloads([raw({ whoopType: "strain", day: "2026-06-28", value: 12 })], conn, now)).toHaveLength(0);
    expect(normalizeWhoopPayloads([raw({ whoopType: "recovery", recovery_score: 66 })], conn, now)).toHaveLength(0);
    expect(normalizeWhoopPayloads([raw({ whoopType: "recovery", day: "2026-06-28", recovery_score: "high" })], conn, now)).toHaveLength(0);
  });
});
