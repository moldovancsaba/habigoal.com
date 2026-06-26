import type { OnboardingModuleView } from "@/types/onboarding";

export type OnboardingPromptState = "loading" | "ready" | "submitting" | "error" | "blocked" | "completed";

export type OnboardingPromptProps = {
  module: OnboardingModuleView;
  state: OnboardingPromptState;
  errorMessage?: string;
  onDismiss: () => Promise<void> | void;
  onComplete: (stepId?: string) => Promise<void> | void;
  onSnooze?: () => Promise<void> | void;
  onRetry?: () => Promise<void> | void;
};

export type OnboardingPromptModel = {
  completedCount: number;
  progressValue: number;
  stepCount: number;
  rendersModal: boolean;
  rendersChecklist: boolean;
  rendersEmptyState: boolean;
  canDismiss: boolean;
  canSnooze: boolean;
  canRetry: boolean;
  canCompleteModule: boolean;
  canCompleteStep: boolean;
  disablesActions: boolean;
  stateBlock: null | {
    variant: "loading" | "empty" | "error" | "permission" | "success" | "info";
    titleKey: "loadingTitle" | "emptyTitle" | "errorTitle" | "blockedTitle" | "completedTitle";
    bodyKey: "loadingBody" | "emptyBody" | "errorBody" | "blockedBody" | "completedBody";
  };
};

export function buildOnboardingPromptModel(module: OnboardingModuleView, state: OnboardingPromptState, callbacks: Pick<OnboardingPromptProps, "onRetry" | "onSnooze"> = {}): OnboardingPromptModel {
  const completedCount = module.completedStepIds.length;
  const stepCount = module.steps.length;
  const progressValue = stepCount ? Math.round((completedCount / stepCount) * 100) : 100;
  const disablesActions = state === "submitting";

  if (state === "loading") {
    return {
      completedCount,
      progressValue,
      stepCount,
      rendersModal: false,
      rendersChecklist: false,
      rendersEmptyState: false,
      canDismiss: false,
      canSnooze: false,
      canRetry: false,
      canCompleteModule: false,
      canCompleteStep: false,
      disablesActions,
      stateBlock: { variant: "loading", titleKey: "loadingTitle", bodyKey: "loadingBody" }
    };
  }

  if (state === "error") {
    return {
      completedCount,
      progressValue,
      stepCount,
      rendersModal: true,
      rendersChecklist: true,
      rendersEmptyState: stepCount === 0,
      canDismiss: true,
      canSnooze: Boolean(callbacks.onSnooze),
      canRetry: Boolean(callbacks.onRetry),
      canCompleteModule: false,
      canCompleteStep: false,
      disablesActions,
      stateBlock: { variant: "error", titleKey: "errorTitle", bodyKey: "errorBody" }
    };
  }

  if (state === "blocked") {
    return {
      completedCount,
      progressValue,
      stepCount,
      rendersModal: true,
      rendersChecklist: false,
      rendersEmptyState: false,
      canDismiss: true,
      canSnooze: false,
      canRetry: false,
      canCompleteModule: false,
      canCompleteStep: false,
      disablesActions,
      stateBlock: { variant: "permission", titleKey: "blockedTitle", bodyKey: "blockedBody" }
    };
  }

  if (state === "completed") {
    return {
      completedCount,
      progressValue: 100,
      stepCount,
      rendersModal: true,
      rendersChecklist: true,
      rendersEmptyState: stepCount === 0,
      canDismiss: true,
      canSnooze: false,
      canRetry: false,
      canCompleteModule: false,
      canCompleteStep: false,
      disablesActions,
      stateBlock: { variant: "success", titleKey: "completedTitle", bodyKey: "completedBody" }
    };
  }

  return {
    completedCount,
    progressValue,
    stepCount,
    rendersModal: true,
    rendersChecklist: true,
    rendersEmptyState: stepCount === 0,
    canDismiss: true,
    canSnooze: Boolean(callbacks.onSnooze),
    canRetry: false,
    canCompleteModule: state === "ready",
    canCompleteStep: state === "ready",
    disablesActions,
    stateBlock: stepCount === 0 ? { variant: "empty", titleKey: "emptyTitle", bodyKey: "emptyBody" } : null
  };
}
