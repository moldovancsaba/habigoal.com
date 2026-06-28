import type { AthleteIqModuleClaimBoundary, AthleteIqModuleMaturity } from "@/lib/athleteiq-modules";

export type CognitiveTrait = "alertness" | "impulse_control" | "attention" | "risk" | "reasoning" | "memory_retention";
export type CognitiveTraitBand = "strength" | "stable" | "watch" | "missing";
export type CognitiveLiteSource = "manual_entry" | "local_profile" | "missing_local_profile";
// Where a trait score came from. `entered` = an athlete submitted a manual
// result; `derived` = computed from the baseline profile (fallback); `missing`
// = no entry and no baseline (no fabricated score).
export type CognitiveProvenance = "entered" | "derived" | "missing";

// Persisted manual cognitive result. Idempotent per (athleteId, trait,
// localDate): a same-day re-entry overwrites the stored score.
export type CognitiveTraitEntry = {
  id?: string;
  athleteId: string;
  trait: CognitiveTrait;
  localDate: string;
  score: number;
  source: "manual_entry";
  enteredAt: string;
  actorEmail?: string;
};
export type CogLeagueTournamentStatus = "disabled_partner_future" | "planned_partner_contract" | "active";
export type CogLeagueCheckpointStatus = "not_available" | "locked_attempt_limit" | "eligible_future";

export type CognitiveTraitResult = {
  trait: CognitiveTrait;
  score: number | null;
  band: CognitiveTraitBand;
  explanationKey: string;
  signatureKey: string;
  improvementTipKey: string;
  source: CognitiveLiteSource;
  provenance: CognitiveProvenance;
  enteredAt: string | null;
  sourceLabelKey: string;
  benchmarkStatus: "non_benchmark";
  claimBoundary: AthleteIqModuleClaimBoundary;
  moduleMaturity: AthleteIqModuleMaturity;
  dataUsed: string[];
  missingData: string[];
};

export type CognitiveLiteJourney = {
  athleteId: string;
  moduleKey: "cognitive_lite";
  moduleMaturity: "lite_manual";
  claimBoundary: "backed_by_manual_entry";
  benchmarkStatus: "non_benchmark";
  traitResults: CognitiveTraitResult[];
  completedTraitCount: number;
  enteredTraitCount: number;
  totalTraitCount: number;
  isComplete: boolean;
  dataUsed: string[];
  missingData: string[];
  sourceLabels: string[];
  generatedAt: string;
  registryVersion: string;
  capabilityKey: string;
  version: string;
};

export type CogLeagueCohort = {
  id: string;
  labelKey: string;
  eligibility: string[];
};

export type CogLeagueTournament = {
  id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  cohorts: CogLeagueCohort[];
  attemptLimit: 3;
  status: CogLeagueTournamentStatus;
  moduleMaturity: "future";
  claimBoundary: "partner_future" | "roadmap_only";
  rankingStatus: "disabled_until_partner_contract";
  rewardsVisible: false;
  revenueClaimsVisible: false;
  requirements: string[];
  dataUsed: string[];
  missingData: string[];
};

export type CogLeagueCheckpoint = {
  athleteId: string;
  tournamentId: string;
  attemptNumber: number;
  completedAt?: string;
  traitResults: CognitiveTraitResult[];
  status: CogLeagueCheckpointStatus;
  lockReason?: string;
  dataUsed: string[];
  missingData: string[];
};

export type CogLeagueBoundary = {
  moduleKey: "cogleague_future";
  enabled: false;
  moduleMaturity: "future";
  claimBoundary: "partner_future";
  tournaments: CogLeagueTournament[];
  checkpointContract: {
    attemptLimit: 3;
    rankingScope: "cohort_and_tournament_window";
    tieBreakersStatus: "not_documented_for_launch";
    consentRequired: true;
    partnerAgreementRequired: true;
  };
  generatedAt: string;
  capabilityKey: string;
  version: string;
};
