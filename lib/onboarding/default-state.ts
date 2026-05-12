import type { OnboardingStateRecord } from "@/types/onboarding";

export function createDefaultOnboardingState(userEmail: string): OnboardingStateRecord {
  return {
    userEmail,
    completedModules: [],
    dismissedModules: [],
    seenReleaseVersions: [],
    checklistProgress: {},
    updatedAt: new Date().toISOString()
  };
}
