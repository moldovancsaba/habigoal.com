import { describe, expect, it } from "vitest";
import { interpretRecoveryTrend, type RecoveryTrendPoint } from "@/lib/recovery-trend";

function series(...scores: number[]): RecoveryTrendPoint[] {
  // Dates ascending so sort order is exercised even when passed out of order.
  return scores.map((recoveryScore, i) => ({
    date: `2026-06-${String(10 + i).padStart(2, "0")}`,
    recoveryScore
  }));
}

describe("interpretRecoveryTrend (#6)", () => {
  it("reports insufficient data for fewer than two points", () => {
    expect(interpretRecoveryTrend([]).direction).toBe("insufficient");
    const one = interpretRecoveryTrend(series(70));
    expect(one.direction).toBe("insufficient");
    expect(one.latestScore).toBe(70);
    expect(one.interpretationKey).toBe("Recovery.trendInsufficient");
    expect(one.readinessInfluence).toBe("neutral");
  });

  it("detects an improving trend and boosts readiness", () => {
    const r = interpretRecoveryTrend(series(40, 45, 50, 70, 75, 80));
    expect(r.direction).toBe("improving");
    expect(r.readinessInfluence).toBe("boosts");
    expect(r.deltaPct).toBeGreaterThan(5);
    expect(r.interpretationKey).toBe("Recovery.trendImproving");
    expect(r.latestScore).toBe(80);
  });

  it("detects a declining trend and reduces readiness", () => {
    const r = interpretRecoveryTrend(series(85, 80, 78, 55, 50, 45));
    expect(r.direction).toBe("declining");
    expect(r.readinessInfluence).toBe("reduces");
    expect(r.deltaPct).toBeLessThan(-5);
    expect(r.interpretationKey).toBe("Recovery.trendDeclining");
  });

  it("treats small changes within the band as stable", () => {
    const r = interpretRecoveryTrend(series(70, 71, 72, 71, 72, 73));
    expect(r.direction).toBe("stable");
    expect(r.readinessInfluence).toBe("neutral");
    expect(r.interpretationKey).toBe("Recovery.trendStable");
  });

  it("sorts unordered input by date before computing", () => {
    const unordered: RecoveryTrendPoint[] = [
      { date: "2026-06-15", recoveryScore: 80 },
      { date: "2026-06-10", recoveryScore: 40 },
      { date: "2026-06-12", recoveryScore: 50 },
    ];
    const r = interpretRecoveryTrend(unordered);
    expect(r.latestScore).toBe(80);
    expect(r.sampleSize).toBe(3);
  });

  it("ignores non-finite scores", () => {
    const r = interpretRecoveryTrend([
      { date: "2026-06-10", recoveryScore: 50 },
      { date: "2026-06-11", recoveryScore: Number.NaN },
      { date: "2026-06-12", recoveryScore: 60 },
    ]);
    expect(r.sampleSize).toBe(2);
  });
});
