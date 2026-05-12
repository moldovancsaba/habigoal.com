export type OnboardingRole = "athlete" | "trainer" | "admin";

export type OnboardingModuleType = "intro" | "tour" | "checklist" | "hint" | "release";

export type OnboardingStep = {
  id: string;
  title?: string;
  body?: string;
  selector?: string;
  placement?: "top" | "right" | "bottom" | "left" | "center";
  route?: string;
};

export type OnboardingModuleConditions = {
  requiresEmptyState?: boolean;
  requiresLinkedAthlete?: boolean;
  requiresTeamMembership?: boolean;
  requiresAuth?: boolean;
};

export type OnboardingModuleDefinition = {
  id: string;
  role: OnboardingRole | "shared";
  type: OnboardingModuleType;
  version: string;
  priority: number;
  routePatterns: string[];
  prerequisites?: string[];
  completionEvent?: string;
  dismissible: boolean;
  conditions?: OnboardingModuleConditions;
  steps: OnboardingStep[];
};

export type OnboardingChecklistProgress = Record<string, string[]>;

export type OnboardingStateRecord = {
  _id?: string;
  userEmail: string;
  completedModules: string[];
  dismissedModules: string[];
  seenReleaseVersions: string[];
  checklistProgress: OnboardingChecklistProgress;
  lastSuggestedModule?: string;
  updatedAt: string;
};

export type OnboardingReleasePrompt = {
  version: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  publishedLabel: string;
  href: string;
};

export type OnboardingStatePatch =
  | { action: "complete"; moduleId: string }
  | { action: "dismiss"; moduleId: string }
  | { action: "seen-release"; version: string }
  | { action: "checklist-step"; moduleId: string; stepId: string };

export type OnboardingEngineInput = {
  role: OnboardingRole;
  pathname: string;
  state: OnboardingStateRecord;
  hasLinkedAthlete?: boolean;
  hasTeamMembership?: boolean;
  isEmptyState?: boolean;
  isAuthenticated?: boolean;
};
