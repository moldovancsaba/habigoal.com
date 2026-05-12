import type { OnboardingModuleDefinition } from "@/types/onboarding";

export const adminOnboardingModules: OnboardingModuleDefinition[] = [
  {
    id: "admin-user-rights",
    role: "admin",
    type: "checklist",
    version: "1",
    priority: 88,
    routePatterns: ["/dashboard/settings"],
    dismissible: true,
    conditions: {
      requiresAuth: true
    },
    steps: [
      {
        id: "open-settings"
      },
      {
        id: "approve-user"
      }
    ]
  },
  {
    id: "admin-team-setup",
    role: "admin",
    type: "checklist",
    version: "1",
    priority: 84,
    routePatterns: ["/dashboard/settings"],
    prerequisites: ["admin-user-rights"],
    completionEvent: "admin.team_saved",
    dismissible: true,
    conditions: {
      requiresAuth: true
    },
    steps: [
      {
        id: "open-team-setup"
      },
      {
        id: "create-team"
      }
    ]
  },
  {
    id: "admin-governance-review",
    role: "admin",
    type: "checklist",
    version: "1",
    priority: 78,
    routePatterns: ["/dashboard/settings"],
    prerequisites: ["admin-team-setup"],
    completionEvent: "admin.settings_saved",
    dismissible: true,
    conditions: {
      requiresAuth: true
    },
    steps: [
      {
        id: "open-governance"
      },
      {
        id: "save-governance"
      }
    ]
  }
];
