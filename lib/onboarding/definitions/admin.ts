import type { OnboardingModuleDefinition } from "@/types/onboarding";

export const adminOnboardingModules: OnboardingModuleDefinition[] = [
  {
    id: "admin-user-rights",
    role: "admin",
    type: "intro",
    version: "1",
    priority: 85,
    routePatterns: ["/dashboard/settings"],
    dismissible: true,
    conditions: {
      requiresAuth: true
    },
    steps: [
      {
        id: "admin-settings",
        title: "Admin setup workspace",
        body: "Manage user rights, teams, athlete assignments, and governance settings here."
      }
    ]
  }
];
