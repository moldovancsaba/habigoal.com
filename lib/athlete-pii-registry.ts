// Canonical registry of MongoDB collections that hold athlete PII, used by the
// GDPR export/erase paths (services/privacy.service.ts). Keeping this list in one
// place means a new athlete-keyed collection cannot silently escape erasure — the
// privacy test asserts the registry stays in sync with the known collection set.
//
// Strategy:
// - "deleteMany": remove every document where `keyField === athleteId`.
// - "pull": the athlete appears inside an array field (`keyField`); remove the
//   athlete from the array but keep the document (e.g. team rosters).

export type AthletePiiEraseStrategy = "deleteMany" | "pull";

export type AthletePiiCollection = {
  collection: string;
  keyField: string;
  strategy: AthletePiiEraseStrategy;
  note?: string;
};

// Collections erased uniformly by athlete key. (children/assessments are handled
// explicitly in privacy.service because they need ObjectId + legacy-identity
// fallback handling; they are listed in ATHLETE_PII_SPECIAL below.)
export const ATHLETE_PII_COLLECTIONS: AthletePiiCollection[] = [
  { collection: "athlete_twins", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_twin_projections", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_checkins", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "habit_records", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_daily_iq_snapshots", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_daily_plans", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_daily_reports", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_lite_module_entries", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_cognitive_entries", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "fms_screens", keyField: "athleteId", strategy: "deleteMany", note: "FMS injury-screen health data" },
  { collection: "athleteiq_mental_routine_completions", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_pain_alerts", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_readiness_routes", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_reflections", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_sessions", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "athleteiq_calendar_entries", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "training_load_records", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "canonical_metrics", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "raw_metrics", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "device_connections", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "consents", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "media_assets", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "vision_analyses", keyField: "athleteId", strategy: "deleteMany" },
  { collection: "coach_actions", keyField: "athleteKey", strategy: "deleteMany" },
  { collection: "audit_events", keyField: "resourceId", strategy: "deleteMany", note: "athlete-scoped audit events; the erase itself is re-audited after deletion" },
  { collection: "teams", keyField: "athleteIds", strategy: "pull", note: "remove athlete from roster, keep the team document" }
];

// Handled explicitly in privacy.service (not via the uniform loop).
export const ATHLETE_PII_SPECIAL = ["children", "assessments"] as const;

// Collections intentionally NOT erased by athlete-data erasure, with rationale.
// These are account- or org-scoped rather than athlete-PII rows.
export const ATHLETE_PII_EXCLUDED: Array<{ collection: string; reason: string }> = [
  { collection: "users", reason: "Account lifecycle — handled by account deletion, not athlete-data erase." },
  { collection: "onboarding_events", reason: "Keyed by userEmail (account-scoped); handled by account deletion." },
  { collection: "settings", reason: "Org/user configuration, not athlete-PII rows." },
  { collection: "session_plans", reason: "Team/coach plans referencing athlete names, not athlete-keyed records." },
  { collection: "team_messages", reason: "Team/author-scoped messages; athletes are not authors in the current model." }
];

// Full set of athlete-PII collection names (uniform + special). The privacy test
// asserts this equals the expected frozen set so new collections are not missed.
export function athletePiiCollectionNames(): string[] {
  return [...ATHLETE_PII_COLLECTIONS.map((entry) => entry.collection), ...ATHLETE_PII_SPECIAL].sort();
}
