// Explainability: versioned rule catalog + applied-rule bundles (#254).
//
// Recommendations were previously opaque free-text reasons. This module makes the
// reasoning transparent and auditable: a versioned catalog of deterministic
// rules, and a builder that returns the exact input -> rule -> output bundle that
// fired, with stable rule ids + versions so any plan/report/coach view can show
// *why* a result was produced (not just the result).
//
// Rules are deterministic and evaluated before any AI/model-assisted layer.

export type ExplainabilityFactValue = number | string | boolean | null | undefined;
export type ExplainabilityFacts = Record<string, ExplainabilityFactValue>;

export interface RuleInputSnapshot {
  key: string;
  value: number | string | boolean | null;
}

export interface ExplanationRuleDef {
  /** Stable id, e.g. "readiness.zone.fatigued". */
  id: string;
  /** Semantic version of this rule's logic. */
  version: string;
  /** i18n key (Explainability.rules.*) describing the rule in plain language. */
  descriptionKey: string;
  /** Fact keys this rule reads — captured into the input snapshot. */
  inputs: string[];
  /** i18n key (Explainability.outputs.*) for the action/output the rule yields. */
  outputKey: string;
  /** Deterministic predicate over the facts. */
  when: (facts: ExplainabilityFacts) => boolean;
}

export interface AppliedRule {
  ruleId: string;
  ruleVersion: string;
  descriptionKey: string;
  outputKey: string;
  inputs: RuleInputSnapshot[];
}

export interface ExplanationBundle {
  catalogVersion: string;
  appliedRules: AppliedRule[];
}

export const RULE_CATALOG_VERSION = "1.0.0";

function num(facts: ExplainabilityFacts, key: string): number | null {
  const v = facts[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Readiness/coaching rule catalog. Zone rules are mutually exclusive by score
// range so exactly one fires; the missing-data and injury rules can co-fire.
export const READINESS_RULES: ExplanationRuleDef[] = [
  {
    id: "readiness.missingData",
    version: "1.0.0",
    descriptionKey: "readinessMissingData",
    inputs: ["missingSignalCount"],
    outputKey: "completeCheckIn",
    when: (f) => (num(f, "missingSignalCount") ?? 0) > 0,
  },
  {
    id: "readiness.zone.good",
    version: "1.0.0",
    descriptionKey: "readinessGood",
    inputs: ["readinessScore"],
    outputKey: "proceedAsPlanned",
    when: (f) => (num(f, "readinessScore") ?? -1) >= 70,
  },
  {
    id: "readiness.zone.moderate",
    version: "1.0.0",
    descriptionKey: "readinessModerate",
    inputs: ["readinessScore"],
    outputKey: "monitorLoad",
    when: (f) => {
      const s = num(f, "readinessScore");
      return s !== null && s >= 50 && s < 70;
    },
  },
  {
    id: "readiness.zone.fatigued",
    version: "1.0.0",
    descriptionKey: "readinessFatigued",
    inputs: ["readinessScore"],
    outputKey: "reduceLoad",
    when: (f) => {
      const s = num(f, "readinessScore");
      return s !== null && s >= 30 && s < 50;
    },
  },
  {
    id: "readiness.zone.compromised",
    version: "1.0.0",
    descriptionKey: "readinessCompromised",
    inputs: ["readinessScore"],
    outputKey: "prioritiseRecovery",
    when: (f) => {
      const s = num(f, "readinessScore");
      return s !== null && s < 30;
    },
  },
  {
    id: "injury.riskElevated",
    version: "1.0.0",
    descriptionKey: "injuryRiskElevated",
    inputs: ["injuryRisk"],
    outputKey: "addInjuryPrevention",
    when: (f) => f.injuryRisk === "high",
  },
];

function snapshotInputs(rule: ExplanationRuleDef, facts: ExplainabilityFacts): RuleInputSnapshot[] {
  return rule.inputs.map((key) => {
    const raw = facts[key];
    return { key, value: raw === undefined ? null : raw };
  });
}

// Build the applied-rule bundle for a set of facts. Returns every rule that
// fired, each with the inputs it read and the output it produced — the
// transparent input -> rule -> output record.
export function buildExplanation(
  facts: ExplainabilityFacts,
  rules: ExplanationRuleDef[] = READINESS_RULES,
  catalogVersion: string = RULE_CATALOG_VERSION
): ExplanationBundle {
  const appliedRules: AppliedRule[] = rules
    .filter((rule) => {
      try {
        return rule.when(facts);
      } catch {
        return false;
      }
    })
    .map((rule) => ({
      ruleId: rule.id,
      ruleVersion: rule.version,
      descriptionKey: rule.descriptionKey,
      outputKey: rule.outputKey,
      inputs: snapshotInputs(rule, facts),
    }));

  return { catalogVersion, appliedRules };
}
