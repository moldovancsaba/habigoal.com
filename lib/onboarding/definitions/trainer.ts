import type { OnboardingModuleDefinition } from "@/types/onboarding";

export const trainerOnboardingModules: OnboardingModuleDefinition[] = [
  {
    id: "trainer-dashboard-intro",
    role: "trainer",
    type: "intro",
    version: "1",
    priority: 90,
    routePatterns: ["/dashboard"],
    dismissible: true,
    conditions: {
      requiresAuth: true
    },
    steps: [
      {
        id: "trainer-dashboard",
        title: "Trainer dashboard",
        body: "Use this view to triage athlete readiness, identify support pressure, and move into athlete detail or planning."
      }
    ]
  }
];
