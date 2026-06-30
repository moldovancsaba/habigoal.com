import { describe, expect, it } from "vitest";
import { buildAthleteInsights, INSIGHT_RULE_VERSION } from "./athlete-insights";

const base = { athleteId: "a1", date: "2026-06-29" };

describe("buildAthleteInsights (#81 REC-001)", () => {
  it("returns no signals when no input crosses a threshold", () => {
    expect(
      buildAthleteInsights({
        ...base,
        readiness: { score: 80 },
        habitRecovery: { completed: 2, total: 2 },
        load: { ratio: 1.0 },
      })
    ).toEqual([]);
  });

  it("links every signal to its source records and stamps the rule version", () => {
    const signals = buildAthleteInsights({
      ...base,
      readiness: { score: 20, checkInId: "c1", date: "2026-06-29" },
      load: { ratio: 1.6, date: "2026-06-29" },
      habitRecovery: { completed: 0, total: 3, recordId: "h1", date: "2026-06-29" },
      reflectionFocus: { text: "weak foot", id: "r1", date: "2026-06-28" },
    });
    expect(signals).toHaveLength(4);
    for (const s of signals) {
      expect(s.sources.length).toBeGreaterThan(0);
      expect(s.ruleVersion).toBe(INSIGHT_RULE_VERSION);
    }
    const load = signals.find((s) => s.kind === "load_management");
    expect(load?.sources[0].type).toBe("training_load");
    const readiness = signals.find((s) => s.kind === "readiness_recovery");
    expect(readiness?.sources[0]).toMatchObject({ type: "check_in", id: "c1" });
  });

  it("orders signals safety/load -> readiness -> habit -> focus", () => {
    const signals = buildAthleteInsights({
      ...base,
      reflectionFocus: { text: "scanning" },
      habitRecovery: { completed: 1, total: 3 },
      readiness: { score: 40 },
      load: { ratio: 1.4 },
    });
    expect(signals.map((s) => s.kind)).toEqual([
      "load_management",
      "readiness_recovery",
      "recovery_habit",
      "tomorrow_focus",
    ]);
  });

  it("escalates severity at the harder thresholds", () => {
    const high = buildAthleteInsights({ ...base, readiness: { score: 25 }, load: { ratio: 1.6 } });
    expect(high.find((s) => s.kind === "load_management")?.severity).toBe("high");
    expect(high.find((s) => s.kind === "readiness_recovery")?.severity).toBe("high");

    const medium = buildAthleteInsights({ ...base, readiness: { score: 45 }, load: { ratio: 1.35 } });
    expect(medium.find((s) => s.kind === "load_management")?.severity).toBe("medium");
    expect(medium.find((s) => s.kind === "readiness_recovery")?.severity).toBe("medium");
  });

  it("never fires a signal without its real input (no fabrication)", () => {
    const signals = buildAthleteInsights({ ...base, reflectionFocus: { text: "   " } });
    expect(signals).toEqual([]); // blank focus does not produce a signal
  });
});
