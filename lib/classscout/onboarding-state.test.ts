import { describe, expect, it } from "vitest";
import {
  buildHouseholdPreferenceInputFromDraft,
  buildProfileInputFromDraft,
  createInitialOnboardingState,
  mapOnboardingApiError,
  skipOnboardingStep,
  submitOnboardingStep,
  updateOnboardingDraft,
  validateOnboardingStep
} from "./onboarding-state";

const now = "2026-06-07T10:00:00.000Z";

describe("ClassScout onboarding state", () => {
  it("creates accessible required and skippable steps", () => {
    const state = createInitialOnboardingState({ householdId: "household-1", now, idempotencyKey: "key-1" });

    expect(state.activeStepId).toBe("household");
    expect(state.steps.map((step) => step.id)).toEqual(["household", "child", "interests", "constraints", "history", "privacy", "complete"]);
    expect(state.steps.every((step) => step.ariaLabel && step.describedBy && step.errorSummaryId)).toBe(true);
    expect(state.steps.find((step) => step.id === "interests")?.canSkip).toBe(true);
    expect(state.steps.find((step) => step.id === "privacy")?.required).toBe(true);
  });

  it("validates household, child, interests, and privacy steps", () => {
    let state = createInitialOnboardingState({ householdId: "household-1", now, idempotencyKey: "key-1" });

    expect(validateOnboardingStep(state, "household")?.code).toBe("VALIDATION_FAILED");

    state = updateOnboardingDraft(state, { household: { travelModes: [" transit "] } }, now);
    expect(validateOnboardingStep(state, "household")).toBeNull();

    expect(validateOnboardingStep(state, "child")?.focusTargetId).toBe("child-error-summary");
    state = updateOnboardingDraft(state, { child: { nickname: " Sam ", ageBand: "6-8" } }, now);
    expect(validateOnboardingStep(state, "child")).toBeNull();

    expect(validateOnboardingStep(state, "interests")?.code).toBe("VALIDATION_FAILED");
    state = updateOnboardingDraft(state, { interests: [" art "] }, now);
    expect(validateOnboardingStep(state, "interests")).toBeNull();

    expect(validateOnboardingStep(state, "privacy")?.code).toBe("CONSENT_REQUIRED");
    state = updateOnboardingDraft(state, { consentAccepted: true }, now);
    expect(validateOnboardingStep(state, "privacy")).toBeNull();
  });

  it("submits steps with normalized payloads and advances state", () => {
    const state = updateOnboardingDraft(
      createInitialOnboardingState({ householdId: "household-1", now, idempotencyKey: "key-1" }),
      { household: { travelModes: [" transit ", "transit"], includeNeighborhoods: [" Buda "] } },
      now
    );

    const submitted = submitOnboardingStep(state, "household", now);

    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.state.activeStepId).toBe("child");
    expect(submitted.payload).toMatchObject({
      householdId: "household-1",
      travelModes: ["transit"],
      includeNeighborhoods: ["Buda"]
    });
  });

  it("skips optional steps but refuses required-step skips", () => {
    let state = createInitialOnboardingState({ householdId: "household-1", now, idempotencyKey: "key-1" });

    state = skipOnboardingStep(state, "household", now);
    expect(state.steps.find((step) => step.id === "household")?.status).toBe("invalid");
    expect(state.lastError?.focusTargetId).toBe("household-error-summary");

    state = skipOnboardingStep(state, "interests", now);
    expect(state.steps.find((step) => step.id === "interests")?.status).toBe("skipped");
    expect(state.activeStepId).toBe("constraints");
  });

  it("maps API errors to stable parent-facing recovery states", () => {
    expect(mapOnboardingApiError("CONSENT_REQUIRED", "privacy")).toMatchObject({ code: "CONSENT_REQUIRED", retryable: false });
    expect(mapOnboardingApiError("PROFILE_UPDATE_TIMEOUT", "child")).toMatchObject({ code: "TIMEOUT", retryable: true });
    expect(mapOnboardingApiError("HOUSEHOLD_SCOPE_DENIED", "child")).toMatchObject({ code: "UNAUTHORIZED", retryable: false });
    expect(mapOnboardingApiError("UNKNOWN", "child")).toMatchObject({ code: "SAVE_FAILED", retryable: true });
  });

  it("builds profile and household payloads without duplicate list values", () => {
    const state = updateOnboardingDraft(
      createInitialOnboardingState({ householdId: "household-1", now, idempotencyKey: "key-1" }),
      {
        household: { travelModes: ["walk", " walk "], formatPreferences: ["drop-in"] },
        child: { nickname: " Sam ", ageBand: "6-8", supportNotes: " optional note " },
        interests: ["art", " art "],
        constraints: ["beginner_friendly", "beginner_friendly"],
        historySignals: { saved: 1 },
        consentAccepted: true
      },
      now
    );

    expect(buildHouseholdPreferenceInputFromDraft(state.draft)).toMatchObject({ travelModes: ["walk"], formatPreferences: ["drop-in"] });
    expect(buildProfileInputFromDraft(state.draft)).toMatchObject({
      householdId: "household-1",
      nickname: "Sam",
      ageBand: "6-8",
      interests: ["art"],
      constraints: ["beginner_friendly"],
      supportNotes: "optional note"
    });
  });
});
