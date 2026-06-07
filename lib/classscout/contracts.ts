export const CLASSSCOUT_UI_AUTHORITY = "sovereignsquad/general-design-system" as const;

export type ClassScoutActor = "parent" | "child_no_account" | "provider" | "operator";
export type ClassScoutRuntimeState =
  | "idle"
  | "loading"
  | "empty"
  | "partial"
  | "disabled"
  | "saving"
  | "success"
  | "validation_error"
  | "system_error"
  | "timeout"
  | "retry_available"
  | "deletion_pending"
  | "rollback_recovered"
  | "permission_denied";

export type ClassScoutBoundary = {
  actor: ClassScoutActor;
  allowedData: string[];
  prohibitedData: string[];
  uiAuthority: typeof CLASSSCOUT_UI_AUTHORITY;
};

export type AgeBand = "3-5" | "6-8" | "9-11" | "12-14" | "15-18";
export type GradeBand = "pre-k" | "k-2" | "3-5" | "6-8" | "9-12";
export type ActivityConstraint =
  | "sensory_consideration"
  | "mobility_consideration"
  | "beginner_friendly"
  | "advanced_peer_group"
  | "short_session"
  | "quiet_environment"
  | "outdoor_preferred"
  | "indoor_preferred";

export type ParticipationSignal = "saved" | "rejected" | "contacted" | "booked" | "attended" | "repeated";

export type ParticipationSignalSummary = Partial<Record<ParticipationSignal, number>>;

export type SensitiveNote = {
  value: string;
  updatedAt: string;
  access: "parent_only" | "privileged_operator_audited";
};

export type TimeWindow = {
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  startTime: string;
  endTime: string;
};

export type HouseholdPreference = {
  householdId: string;
  travelModes: string[];
  budgetRange?: { min?: number; max?: number };
  availableWindows: TimeWindow[];
  includeNeighborhoods: string[];
  excludeNeighborhoods: string[];
  formatPreferences: string[];
  updatedAt: string;
};

export type ChildActivityProfile = {
  id: string;
  householdId: string;
  nickname: string;
  ageBand: AgeBand;
  gradeBand?: GradeBand;
  neighborhoodPreference?: string;
  interests: string[];
  constraints: ActivityConstraint[];
  experienceSignals: ParticipationSignalSummary;
  supportNotes?: SensitiveNote;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type ChildActivityProfileInput = {
  householdId: string;
  nickname: string;
  ageBand: AgeBand;
  gradeBand?: GradeBand;
  neighborhoodPreference?: string;
  interests?: string[];
  constraints?: ActivityConstraint[];
  experienceSignals?: ParticipationSignalSummary;
  supportNotes?: string;
};

export type HouseholdPreferenceInput = Omit<HouseholdPreference, "updatedAt">;

export type RedactedChildActivityProfile = Omit<ChildActivityProfile, "supportNotes"> & {
  hasSupportNotes: boolean;
};

export type HouseholdProfileExport = {
  householdId: string;
  profiles: RedactedChildActivityProfile[];
  preferences?: HouseholdPreference;
  exportedAt: string;
};

export type ClassScoutServiceResult<T> =
  | { ok: true; data: T; state: ClassScoutRuntimeState; error: null }
  | { ok: false; data: null; state: ClassScoutRuntimeState; error: { code: string; message: string; retryable: boolean } };

export const classScoutBoundaries: ClassScoutBoundary[] = [
  {
    actor: "parent",
    allowedData: ["household preferences", "child activity preferences", "participation signals", "privacy requests"],
    prohibitedData: ["child independent credentials", "clinical diagnosis", "school education records", "data resale consent"],
    uiAuthority: CLASSSCOUT_UI_AUTHORITY
  },
  {
    actor: "child_no_account",
    allowedData: ["parent-managed nickname", "age band", "activity interests"],
    prohibitedData: ["login credentials", "direct messaging", "public profile", "behavioral advertising profile"],
    uiAuthority: CLASSSCOUT_UI_AUTHORITY
  },
  {
    actor: "provider",
    allowedData: ["public activity listing", "claim verification", "approved listing updates"],
    prohibitedData: ["child profile data", "household identity", "support notes", "private participation history"],
    uiAuthority: CLASSSCOUT_UI_AUTHORITY
  },
  {
    actor: "operator",
    allowedData: ["review queue state", "source confidence", "redacted audit events", "reason-coded privileged access"],
    prohibitedData: ["raw child notes by default", "parent email in telemetry", "full request bodies", "secret values"],
    uiAuthority: CLASSSCOUT_UI_AUTHORITY
  }
];

export const classScoutRouteInventory = [
  "/api/classscout/profiles",
  "/api/classscout/activities",
  "/api/classscout/recommendations",
  "/api/classscout/provider-claims",
  "/api/classscout/privacy"
] as const;
