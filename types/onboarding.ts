import type { AppRole } from "@/lib/access";

export type OnboardingEventType = "shown" | "dismissed" | "snoozed" | "completed" | "failed";
export type OnboardingModuleState = "eligible" | "shown" | "dismissed" | "snoozed" | "completed" | "blocked" | "failed";

export type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  completionEvent?: string;
};

export type OnboardingModule = {
  id: string;
  role: AppRole;
  routePattern: string;
  priority: number;
  title: string;
  body: string;
  checklistTitle?: string;
  steps: OnboardingStep[];
};

export type OnboardingEventRecord = {
  id?: string;
  userEmail: string;
  moduleId: string;
  event: OnboardingEventType;
  route: string;
  stepId?: string;
  idempotencyKey?: string;
  createdAt: string;
};

export type OnboardingModuleView = OnboardingModule & {
  state: OnboardingModuleState;
  lastEventAt?: string;
  completedStepIds: string[];
};
