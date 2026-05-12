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
        id: "open-settings",
        title: "Admin setup workspace",
        body: "Manage user rights, teams, athlete assignments, and governance settings here."
      },
      {
        id: "approve-user",
        title: "Approve one user",
        body: "Add or update one user so access control is anchored to the local role model before SSO entry."
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
        id: "open-team-setup",
        title: "Open team setup",
        body: "Use the team management section to connect trainers and athletes to the same operational group."
      },
      {
        id: "create-team",
        title: "Create your first team",
        body: "Save one team with trainers and athletes so trainer scope and athlete ownership are defined in the platform."
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
        id: "open-governance",
        title: "Review governance and standards",
        body: "Check governance metrics, restore tools, and standards configuration so the platform stays trustworthy as more users join."
      },
      {
        id: "save-governance",
        title: "Save one admin configuration change",
        body: "Persist one settings or standards change to confirm the admin setup flow is working end to end."
      }
    ]
  }
];
