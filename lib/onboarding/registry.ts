import { adminOnboardingModules } from "@/lib/onboarding/definitions/admin";
import { athleteOnboardingModules } from "@/lib/onboarding/definitions/athlete";
import { sharedOnboardingModules } from "@/lib/onboarding/definitions/shared";
import { trainerOnboardingModules } from "@/lib/onboarding/definitions/trainer";
import type { OnboardingModuleDefinition } from "@/types/onboarding";

export const onboardingDefinitions: OnboardingModuleDefinition[] = [
  ...athleteOnboardingModules,
  ...trainerOnboardingModules,
  ...adminOnboardingModules,
  ...sharedOnboardingModules
];
