import { describe, expect, it } from "vitest";
import { buildOnboardingPromptModel, type OnboardingPromptState } from "@/lib/onboarding-prompt";
import type { OnboardingModuleView } from "@/types/onboarding";

const moduleView: OnboardingModuleView = {
  id: "athlete-first-login-baseline",
  role: "athlete",
  routePattern: "/athlete-iq",
  priority: 10,
  title: "Set up your athlete baseline",
  body: "Confirm setup details.",
  checklistTitle: "Athlete setup",
  steps: [
    { id: "profile", title: "Open profile", body: "Review profile." },
    { id: "check-in", title: "Complete check-in", body: "Submit readiness." }
  ],
  state: "eligible",
  completedStepIds: ["profile"]
};

describe("OnboardingPrompt model", () => {
  it("renders loading without a modal focus trap", () => {
    const model = buildOnboardingPromptModel(moduleView, "loading");

    expect(model.rendersModal).toBe(false);
    expect(model.stateBlock?.variant).toBe("loading");
    expect(model.canDismiss).toBe(false);
    expect(model.canCompleteStep).toBe(false);
  });

  it("renders ready checklist actions and deterministic progress", () => {
    const model = buildOnboardingPromptModel(moduleView, "ready", { onSnooze: () => undefined });

    expect(model.rendersModal).toBe(true);
    expect(model.rendersChecklist).toBe(true);
    expect(model.completedCount).toBe(1);
    expect(model.progressValue).toBe(50);
    expect(model.canDismiss).toBe(true);
    expect(model.canSnooze).toBe(true);
    expect(model.canCompleteModule).toBe(true);
    expect(model.canCompleteStep).toBe(true);
  });

  it.each<OnboardingPromptState>(["error", "blocked", "completed"])("renders recoverable terminal state for %s", (state) => {
    const model = buildOnboardingPromptModel(moduleView, state, { onRetry: () => undefined, onSnooze: () => undefined });

    expect(model.rendersModal).toBe(true);
    expect(model.canDismiss).toBe(true);
    expect(model.canCompleteModule).toBe(false);
    expect(model.canCompleteStep).toBe(false);
    expect(model.stateBlock).not.toBeNull();
  });

  it("enables retry only when the provider supplies a retry callback", () => {
    expect(buildOnboardingPromptModel(moduleView, "error").canRetry).toBe(false);
    expect(buildOnboardingPromptModel(moduleView, "error", { onRetry: () => undefined }).canRetry).toBe(true);
  });

  it("renders an empty state for modules without checklist steps", () => {
    const emptyModule = { ...moduleView, steps: [], completedStepIds: [] };
    const model = buildOnboardingPromptModel(emptyModule, "ready");

    expect(model.progressValue).toBe(100);
    expect(model.rendersEmptyState).toBe(true);
    expect(model.stateBlock?.variant).toBe("empty");
  });
});
