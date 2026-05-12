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
        id: "trainer-dashboard"
      }
    ]
  },
  {
    id: "trainer-athlete-management",
    role: "trainer",
    type: "checklist",
    version: "1",
    priority: 85,
    routePatterns: ["/dashboard/athletes", "/dashboard/athletes/[id]"],
    prerequisites: ["trainer-dashboard-intro"],
    completionEvent: "trainer.athlete_opened",
    dismissible: true,
    conditions: {
      requiresAuth: true,
      requiresTeamMembership: true
    },
    steps: [
      {
        id: "open-athlete-roster"
      },
      {
        id: "open-athlete-detail"
      }
    ]
  },
  {
    id: "trainer-planning-week",
    role: "trainer",
    type: "checklist",
    version: "1",
    priority: 80,
    routePatterns: ["/dashboard/planning"],
    prerequisites: ["trainer-athlete-management"],
    completionEvent: "trainer.plan_saved",
    dismissible: true,
    conditions: {
      requiresAuth: true,
      requiresTeamMembership: true
    },
    steps: [
      {
        id: "open-planning"
      },
      {
        id: "save-planning"
      }
    ]
  }
];
