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
        id: "open-athlete-roster",
        title: "Open your athlete roster",
        body: "Use the athlete management view to scan your team, filter attention areas, and pick who needs follow-up."
      },
      {
        id: "open-athlete-detail",
        title: "Open one athlete detail page",
        body: "Review one athlete in full so you can move from triage into trends, habits, memory, and weekly context."
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
        id: "open-planning",
        title: "Open the weekly planning board",
        body: "Review the weekly session shape so live readiness, missed check-ins, and load pressure feed directly into coach planning."
      },
      {
        id: "save-planning",
        title: "Save one weekly plan",
        body: "Save one weekly plan with coach notes so your team has a persisted operational plan to work from."
      }
    ]
  }
];
