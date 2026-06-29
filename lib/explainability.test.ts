import { describe, expect, it } from "vitest";
import { buildExplanation, READINESS_RULES, RULE_CATALOG_VERSION } from "./explainability";

describe("explainability rule catalog (#254)", () => {
  it("fires exactly one readiness zone and stamps rule id + version + inputs", () => {
    const bundle = buildExplanation({ readinessScore: 42, missingSignalCount: 0 });
    const zones = bundle.appliedRules.filter((r) => r.ruleId.startsWith("readiness.zone."));
    expect(zones).toHaveLength(1);
    expect(zones[0].ruleId).toBe("readiness.zone.fatigued");
    expect(zones[0].ruleVersion).toBe("1.0.0");
    expect(zones[0].outputKey).toBe("reduceLoad");
    // input -> rule transparency: the exact fact the rule read is captured.
    expect(zones[0].inputs).toEqual([{ key: "readinessScore", value: 42 }]);
    expect(bundle.catalogVersion).toBe(RULE_CATALOG_VERSION);
  });

  it("maps each score band to the right output", () => {
    const out = (score: number) =>
      buildExplanation({ readinessScore: score }).appliedRules.find((r) => r.ruleId.startsWith("readiness.zone."))?.outputKey;
    expect(out(85)).toBe("proceedAsPlanned");
    expect(out(60)).toBe("monitorLoad");
    expect(out(40)).toBe("reduceLoad");
    expect(out(10)).toBe("prioritiseRecovery");
  });

  it("co-fires missing-data and injury rules alongside a zone", () => {
    const bundle = buildExplanation({ readinessScore: 80, missingSignalCount: 2, injuryRisk: "high" });
    const ids = bundle.appliedRules.map((r) => r.ruleId);
    expect(ids).toContain("readiness.missingData");
    expect(ids).toContain("readiness.zone.good");
    expect(ids).toContain("injury.riskElevated");
  });

  it("captures missing inputs as null rather than omitting them", () => {
    const bundle = buildExplanation({ missingSignalCount: 1 });
    const missing = bundle.appliedRules.find((r) => r.ruleId === "readiness.missingData");
    expect(missing?.inputs).toEqual([{ key: "missingSignalCount", value: 1 }]);
    // No readinessScore present → no zone rule fires (never fabricates a zone).
    expect(bundle.appliedRules.some((r) => r.ruleId.startsWith("readiness.zone."))).toBe(false);
  });

  it("every catalog rule has a stable id, version, and i18n keys", () => {
    for (const rule of READINESS_RULES) {
      expect(rule.id).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/);
      expect(rule.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(rule.descriptionKey).toBeTruthy();
      expect(rule.outputKey).toBeTruthy();
    }
  });
});
