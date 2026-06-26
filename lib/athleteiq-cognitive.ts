import { ATHLETEIQ_MODULE_REGISTRY_VERSION, getAthleteIqModule } from "@/lib/athleteiq-modules";
import type { ChildProfile } from "@/repositories/child.repository";
import type {
  CognitiveLiteJourney,
  CognitiveTrait,
  CognitiveTraitBand,
  CognitiveTraitResult,
  CogLeagueBoundary,
  CogLeagueCheckpoint,
  CogLeagueTournament
} from "@/types/athleteiq-cognitive";

export const ATHLETEIQ_COGNITIVE_CAPABILITY_KEY = "AIQ-1330";
export const ATHLETEIQ_COGNITIVE_VERSION = "aiq-cognitive-boundary-1330.1";
export const ATHLETEIQ_COGNITIVE_TIMEOUT_MS = 2500;

const cognitiveTraits: CognitiveTrait[] = ["alertness", "impulse_control", "attention", "risk", "reasoning", "memory_retention"];

export function buildCognitiveLiteJourney(input: { athleteId: string; athlete: ChildProfile | null; now?: Date }): CognitiveLiteJourney {
  const moduleDefinition = getAthleteIqModule("cognitive_lite");
  if (!moduleDefinition || moduleDefinition.maturity !== "lite_manual") throw new Error("cognitive_lite must remain lite_manual");
  const traitResults = cognitiveTraits.map((trait) => buildTraitResult(trait, input.athlete));
  const completedTraitCount = traitResults.filter((result) => result.score !== null).length;

  return {
    athleteId: input.athleteId,
    moduleKey: "cognitive_lite",
    moduleMaturity: "lite_manual",
    claimBoundary: "backed_by_manual_entry",
    benchmarkStatus: "non_benchmark",
    traitResults,
    completedTraitCount,
    totalTraitCount: cognitiveTraits.length,
    isComplete: completedTraitCount === cognitiveTraits.length,
    dataUsed: Array.from(new Set(traitResults.flatMap((result) => result.dataUsed))),
    missingData: Array.from(new Set(traitResults.flatMap((result) => result.missingData))),
    sourceLabels: Array.from(new Set(traitResults.map((result) => result.sourceLabelKey))),
    generatedAt: (input.now ?? new Date()).toISOString(),
    registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
    capabilityKey: ATHLETEIQ_COGNITIVE_CAPABILITY_KEY,
    version: ATHLETEIQ_COGNITIVE_VERSION
  };
}

export function buildCogLeagueBoundary(now = new Date()): CogLeagueBoundary {
  const moduleDefinition = getAthleteIqModule("cogleague_future");
  if (!moduleDefinition || moduleDefinition.maturity !== "future") throw new Error("cogleague_future must remain future-only");
  return {
    moduleKey: "cogleague_future",
    enabled: false,
    moduleMaturity: "future",
    claimBoundary: "partner_future",
    tournaments: [buildDisabledTournament(now)],
    checkpointContract: {
      attemptLimit: 3,
      rankingScope: "cohort_and_tournament_window",
      tieBreakersStatus: "not_documented_for_launch",
      consentRequired: true,
      partnerAgreementRequired: true
    },
    generatedAt: now.toISOString(),
    capabilityKey: ATHLETEIQ_COGNITIVE_CAPABILITY_KEY,
    version: ATHLETEIQ_COGNITIVE_VERSION
  };
}

export function buildCogLeagueCheckpointContract(input: {
  athleteId: string;
  tournamentId: string;
  attemptNumber: number;
  traitResults: CognitiveTraitResult[];
}): CogLeagueCheckpoint {
  const attemptLimit = 3;
  return {
    athleteId: input.athleteId,
    tournamentId: input.tournamentId,
    attemptNumber: input.attemptNumber,
    traitResults: input.traitResults,
    status: input.attemptNumber > attemptLimit ? "locked_attempt_limit" : "not_available",
    lockReason: input.attemptNumber > attemptLimit ? "attempt_limit_exceeded" : "partner_agreement_and_consent_required",
    dataUsed: [],
    missingData: ["partner_agreement", "athlete_consent", "quarterly_checkpoint_window", "cohort_contract", "ranking_tie_breakers"]
  };
}

export function validateCognitiveLiteRequest(input: { athleteId?: string | null }) {
  const errors: string[] = [];
  if (!input.athleteId?.trim()) errors.push("athleteId is required");
  return errors;
}

export function validateCogLeagueBoundary(boundary: CogLeagueBoundary) {
  const errors: string[] = [];
  if (boundary.enabled) errors.push("CogLeague must remain disabled until partner agreement and consent gates are implemented");
  for (const tournament of boundary.tournaments) {
    if (tournament.status === "active") errors.push(`${tournament.id} cannot be active in the future boundary contract`);
    if (tournament.rewardsVisible || tournament.revenueClaimsVisible) errors.push(`${tournament.id} cannot expose rewards or revenue claims`);
    if (tournament.dataUsed.length) errors.push(`${tournament.id} cannot report live data while disabled`);
  }
  return errors;
}

export function withCognitiveTimeout<T>(operation: Promise<T>, timeoutMs = ATHLETEIQ_COGNITIVE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("COGNITIVE_TIMEOUT")), timeoutMs);
    })
  ]);
}

function buildTraitResult(trait: CognitiveTrait, athlete: ChildProfile | null): CognitiveTraitResult {
  const score = normalizeTraitScore(trait, athlete);
  const missingData = score === null ? [`profile_baseline:${trait}`] : [];
  return {
    trait,
    score,
    band: bandForScore(score),
    explanationKey: `athleteiq.cognitiveLite.explanation.${trait}`,
    signatureKey: `athleteiq.cognitiveLite.signature.${trait}`,
    improvementTipKey: `athleteiq.cognitiveLite.tip.${trait}`,
    source: score === null ? "missing_local_profile" : "local_profile",
    sourceLabelKey: score === null ? "athleteiq.sources.missing.profileBaseline" : "athleteiq.sources.localProfileBaseline",
    benchmarkStatus: "non_benchmark",
    claimBoundary: "backed_by_manual_entry",
    moduleMaturity: "lite_manual",
    dataUsed: score === null ? [] : [`profile_baseline:${trait}`],
    missingData
  };
}

function normalizeTraitScore(trait: CognitiveTrait, athlete: ChildProfile | null) {
  const baseline = athlete?.baselineProfile;
  if (!baseline) return null;
  const cognitive = normalizeRange(baseline.cognitiveScore, 40, 200);
  const focus = normalizeRange(baseline.focusBaseline, 0, 100);
  const confidence = normalizeRange(baseline.confidenceBaseline, 0, 100);
  const motivation = normalizeRange(baseline.motivationBaseline, 0, 100);
  const stress = baseline.stressBaseline === undefined ? null : 100 - normalizeRange(baseline.stressBaseline, 0, 100)!;

  if (trait === "alertness") return averageDefined([cognitive, focus]);
  if (trait === "impulse_control") return averageDefined([confidence, motivation, stress]);
  if (trait === "attention") return focus;
  if (trait === "risk") return stress;
  if (trait === "reasoning") return cognitive;
  return averageDefined([cognitive, focus, confidence]);
}

function normalizeRange(value: number | undefined, min: number, max: number) {
  if (value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(((value - min) / (max - min)) * 100)));
}

function averageDefined(values: Array<number | null>) {
  const defined = values.filter((value): value is number => value !== null);
  if (!defined.length) return null;
  return Math.round(defined.reduce((sum, value) => sum + value, 0) / defined.length);
}

function bandForScore(score: number | null): CognitiveTraitBand {
  if (score === null) return "missing";
  if (score >= 75) return "strength";
  if (score >= 50) return "stable";
  return "watch";
}

function buildDisabledTournament(now: Date): CogLeagueTournament {
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1 as 1 | 2 | 3 | 4;
  return {
    id: `cogleague:${now.getUTCFullYear()}-q${quarter}:future-template`,
    year: now.getUTCFullYear(),
    quarter,
    cohorts: [
      { id: "u13-u15", labelKey: "athleteiq.cogleague.cohorts.u13u15", eligibility: ["partner_contract_required", "guardian_consent_required"] },
      { id: "u16-u18", labelKey: "athleteiq.cogleague.cohorts.u16u18", eligibility: ["partner_contract_required", "athlete_consent_required"] },
      { id: "senior", labelKey: "athleteiq.cogleague.cohorts.senior", eligibility: ["partner_contract_required", "athlete_consent_required"] }
    ],
    attemptLimit: 3,
    status: "disabled_partner_future",
    moduleMaturity: "future",
    claimBoundary: "partner_future",
    rankingStatus: "disabled_until_partner_contract",
    rewardsVisible: false,
    revenueClaimsVisible: false,
    requirements: ["partner_agreement", "athlete_consent", "quarterly_checkpoint_window", "cohort_contract", "ranking_tie_breakers"],
    dataUsed: [],
    missingData: ["partner_agreement", "athlete_consent", "quarterly_checkpoint_window", "cohort_contract", "ranking_tie_breakers"]
  };
}
