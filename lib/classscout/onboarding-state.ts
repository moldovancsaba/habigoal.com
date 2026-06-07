import type { ActivityConstraint, AgeBand, ChildActivityProfileInput, HouseholdPreferenceInput } from "./contracts";

export type OnboardingStepId = "household" | "child" | "interests" | "constraints" | "history" | "privacy" | "complete";
export type OnboardingStepStatus = "empty" | "valid" | "invalid" | "saving" | "saved" | "failed" | "skipped" | "consent_required";
export type OnboardingApiErrorCode = "VALIDATION_FAILED" | "CONSENT_REQUIRED" | "UNAUTHORIZED" | "RATE_LIMITED" | "SAVE_FAILED" | "TIMEOUT";

export type OnboardingStep = {
  id: OnboardingStepId;
  status: OnboardingStepStatus;
  canSkip: boolean;
  required: boolean;
  ariaLabel: string;
  describedBy: string;
  errorSummaryId: string;
};

export type OnboardingError = {
  code: OnboardingApiErrorCode;
  message: string;
  retryable: boolean;
  focusTargetId: string;
};

export type OnboardingDraft = {
  household: Partial<Pick<HouseholdPreferenceInput, "householdId" | "travelModes" | "includeNeighborhoods" | "excludeNeighborhoods" | "formatPreferences" | "availableWindows">>;
  child: Partial<Pick<ChildActivityProfileInput, "householdId" | "nickname" | "ageBand" | "gradeBand" | "neighborhoodPreference" | "supportNotes">>;
  interests: string[];
  constraints: ActivityConstraint[];
  historySignals: ChildActivityProfileInput["experienceSignals"];
  consentAccepted: boolean;
};

export type OnboardingState = {
  steps: OnboardingStep[];
  activeStepId: OnboardingStepId;
  draft: OnboardingDraft;
  idempotencyKey: string;
  lastError?: OnboardingError;
  updatedAt: string;
};

export type OnboardingSubmitResult =
  | { ok: true; state: OnboardingState; payload: ChildActivityProfileInput | HouseholdPreferenceInput | null }
  | { ok: false; state: OnboardingState; error: OnboardingError };

const BASE_STEPS: OnboardingStep[] = [
  step("household", true, false, "Household preferences", "household-help"),
  step("child", true, false, "Child activity profile basics", "child-help"),
  step("interests", true, true, "Activity interests", "interests-help"),
  step("constraints", false, true, "Activity constraints", "constraints-help"),
  step("history", false, true, "Participation history", "history-help"),
  step("privacy", true, false, "Privacy consent", "privacy-help"),
  step("complete", false, false, "Profile setup complete", "complete-help")
];

export function createInitialOnboardingState({
  householdId,
  now,
  idempotencyKey
}: {
  householdId: string;
  now: string;
  idempotencyKey: string;
}): OnboardingState {
  return {
    steps: BASE_STEPS.map((item) => ({ ...item })),
    activeStepId: "household",
    draft: {
      household: { householdId, travelModes: [], includeNeighborhoods: [], excludeNeighborhoods: [], formatPreferences: [], availableWindows: [] },
      child: { householdId },
      interests: [],
      constraints: [],
      historySignals: {},
      consentAccepted: false
    },
    idempotencyKey,
    updatedAt: now
  };
}

export function updateOnboardingDraft(state: OnboardingState, patch: Partial<OnboardingDraft>, now: string): OnboardingState {
  return {
    ...state,
    draft: {
      ...state.draft,
      ...patch,
      household: { ...state.draft.household, ...patch.household },
      child: { ...state.draft.child, ...patch.child }
    },
    updatedAt: now
  };
}

export function validateOnboardingStep(state: OnboardingState, stepId: OnboardingStepId): OnboardingError | null {
  const { draft } = state;

  if (stepId === "household" && !hasAny(draft.household.travelModes) && !hasAny(draft.household.includeNeighborhoods)) {
    return error("VALIDATION_FAILED", "Add at least one travel mode or neighborhood preference.", false, "household-error-summary");
  }

  if (stepId === "child") {
    if (!normalize(draft.child.nickname)) {
      return error("VALIDATION_FAILED", "Add a child nickname before continuing.", false, "child-error-summary");
    }
    if (!draft.child.ageBand) {
      return error("VALIDATION_FAILED", "Select an age band before continuing.", false, "child-error-summary");
    }
  }

  if (stepId === "interests" && !hasAny(draft.interests)) {
    return error("VALIDATION_FAILED", "Choose at least one interest or skip personalization.", false, "interests-error-summary");
  }

  if (stepId === "privacy" && !draft.consentAccepted) {
    return error("CONSENT_REQUIRED", "Parent consent is required before profile personalization can be activated.", false, "privacy-error-summary");
  }

  return null;
}

export function submitOnboardingStep(state: OnboardingState, stepId: OnboardingStepId, now: string): OnboardingSubmitResult {
  const validationError = validateOnboardingStep(state, stepId);
  if (validationError) {
    return { ok: false, state: setStepStatus(state, stepId, "invalid", now, validationError), error: validationError };
  }

  const savedState = advanceOnboardingStep(setStepStatus(state, stepId, "saved", now), stepId, now);
  return { ok: true, state: savedState, payload: buildStepPayload(savedState, stepId) };
}

export function skipOnboardingStep(state: OnboardingState, stepId: OnboardingStepId, now: string): OnboardingState {
  const current = state.steps.find((item) => item.id === stepId);
  if (!current?.canSkip) {
    const skipError = error("VALIDATION_FAILED", "This onboarding step cannot be skipped.", false, `${stepId}-error-summary`);
    return setStepStatus(state, stepId, "invalid", now, skipError);
  }

  return advanceOnboardingStep(setStepStatus(state, stepId, "skipped", now), stepId, now);
}

export function mapOnboardingApiError(code: string, stepId: OnboardingStepId): OnboardingError {
  if (code === "CONSENT_REQUIRED") {
    return error("CONSENT_REQUIRED", "Parent consent is required before continuing.", false, "privacy-error-summary");
  }
  if (code === "UNAUTHORIZED" || code === "HOUSEHOLD_SCOPE_DENIED" || code === "CONSENT_SCOPE_DENIED") {
    return error("UNAUTHORIZED", "You do not have permission to update this profile.", false, `${stepId}-error-summary`);
  }
  if (code === "RATE_LIMITED") {
    return error("RATE_LIMITED", "Too many attempts. Wait before trying again.", true, `${stepId}-error-summary`);
  }
  if (code === "TIMEOUT" || code.endsWith("_TIMEOUT")) {
    return error("TIMEOUT", "The request timed out. Try again without resubmitting new data.", true, `${stepId}-error-summary`);
  }
  return error("SAVE_FAILED", "The step could not be saved. Try again.", true, `${stepId}-error-summary`);
}

export function buildProfileInputFromDraft(draft: OnboardingDraft): ChildActivityProfileInput {
  return {
    householdId: normalize(draft.child.householdId ?? draft.household.householdId ?? ""),
    nickname: normalize(draft.child.nickname ?? ""),
    ageBand: draft.child.ageBand as AgeBand,
    gradeBand: draft.child.gradeBand,
    neighborhoodPreference: normalizeOptional(draft.child.neighborhoodPreference),
    interests: normalizeList(draft.interests),
    constraints: [...new Set(draft.constraints)],
    experienceSignals: draft.historySignals ?? {},
    supportNotes: normalizeOptional(draft.child.supportNotes)
  };
}

export function buildHouseholdPreferenceInputFromDraft(draft: OnboardingDraft): HouseholdPreferenceInput {
  return {
    householdId: normalize(draft.household.householdId ?? draft.child.householdId ?? ""),
    travelModes: normalizeList(draft.household.travelModes ?? []),
    includeNeighborhoods: normalizeList(draft.household.includeNeighborhoods ?? []),
    excludeNeighborhoods: normalizeList(draft.household.excludeNeighborhoods ?? []),
    formatPreferences: normalizeList(draft.household.formatPreferences ?? []),
    availableWindows: draft.household.availableWindows ?? []
  };
}

function setStepStatus(
  state: OnboardingState,
  stepId: OnboardingStepId,
  status: OnboardingStepStatus,
  now: string,
  lastError?: OnboardingError
): OnboardingState {
  return {
    ...state,
    steps: state.steps.map((item) => (item.id === stepId ? { ...item, status } : item)),
    lastError,
    updatedAt: now
  };
}

function advanceOnboardingStep(state: OnboardingState, stepId: OnboardingStepId, now: string): OnboardingState {
  const index = state.steps.findIndex((item) => item.id === stepId);
  const next = state.steps[index + 1]?.id ?? "complete";
  return { ...state, activeStepId: next, updatedAt: now };
}

function buildStepPayload(state: OnboardingState, stepId: OnboardingStepId): ChildActivityProfileInput | HouseholdPreferenceInput | null {
  if (stepId === "household") {
    return buildHouseholdPreferenceInputFromDraft(state.draft);
  }
  if (stepId === "child" || stepId === "interests" || stepId === "constraints" || stepId === "history" || stepId === "privacy") {
    return buildProfileInputFromDraft(state.draft);
  }
  return null;
}

function step(id: OnboardingStepId, required: boolean, canSkip: boolean, ariaLabel: string, describedBy: string): OnboardingStep {
  return { id, status: "empty", required, canSkip, ariaLabel, describedBy, errorSummaryId: `${id}-error-summary` };
}

function error(code: OnboardingApiErrorCode, message: string, retryable: boolean, focusTargetId: string): OnboardingError {
  return { code, message, retryable, focusTargetId };
}

function hasAny(values: string[] | undefined): boolean {
  return Boolean(values?.some((value) => normalize(value)));
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = normalize(value ?? "");
  return normalized || undefined;
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
