import { describe, expect, it } from "vitest";
import { computeCoachingQueueEntry } from "./athleteiq-coaching-queue.service";
import type { AthleteTwin } from "@/types/athlete-twin";

function twin(overrides: Partial<Record<"physical" | "performance" | "recovery", Record<string, number>>> = {}): AthleteTwin {
  const base = { updatedAt: "2026-07-01T00:00:00.000Z", sources: ["check_in"], confidence: "high" as const };
  return {
    athleteId: "a1",
    organisationId: "default",
    twinVersion: 1,
    schemaVersion: "1.0.0",
    lastUpdatedAt: base.updatedAt,
    physical: { ...base, ...(overrides.physical ?? {}) },
    performance: { ...base, ...(overrides.performance ?? {}) },
    technical: { ...base },
    recovery: { ...base, ...(overrides.recovery ?? {}) },
    cognitive: { ...base },
    history: [],
    createdAt: base.updatedAt,
    updatedAt: base.updatedAt,
  };
}

describe("coaching queue entry (GH-525 P0)", () => {
  it("produces a recommendation + injury-risk entry from a twin", async () => {
    const entry = await computeCoachingQueueEntry("a1", twin({ physical: { restingHeartRateBpm: 55 }, recovery: { sleepQualityScore7d: 80 } }));
    expect(entry.athleteId).toBe("a1");
    expect(entry.recommendation.text.length).toBeGreaterThan(0);
    expect(["low", "elevated", "high"]).toContain(entry.injuryRisk.riskLevel);
    expect(typeof entry.urgency).toBe("number");
  });

  it("flags high injury risk with higher urgency than a clean athlete", async () => {
    const clean = await computeCoachingQueueEntry("a1", twin({ physical: { restingHeartRateBpm: 52 }, recovery: { sleepQualityScore7d: 85 } }));
    const risky = await computeCoachingQueueEntry(
      "a2",
      twin({ performance: { acwr: 1.8 }, physical: { leftRightAsymmetryPct: 20 } })
    );
    expect(risky.injuryRisk.riskLevel).not.toBe("low");
    expect(risky.urgency).toBeGreaterThan(clean.urgency);
  });

  it("requires human review for a minor even when signals are fine", async () => {
    const entry = await computeCoachingQueueEntry(
      "a1",
      twin({ physical: { restingHeartRateBpm: 55 }, recovery: { sleepQualityScore7d: 80 } }),
      null,
      "2014-01-01"
    );
    expect(entry.recommendation.humanReviewRequired).toBe(true);
    expect(entry.recommendation.delivery).toBe("awaiting_review");
  });
});
