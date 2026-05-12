import type { OnboardingModuleDefinition } from "@/types/onboarding";

export const sharedOnboardingModules: OnboardingModuleDefinition[] = [
  {
    id: "news-whats-new",
    role: "shared",
    type: "release",
    version: "1",
    priority: 70,
    routePatterns: ["/news", "/news/[slug]"],
    dismissible: true,
    steps: [
      {
        id: "news-surface"
      }
    ]
  }
];
