import type { OnboardingModuleDefinition } from "@/types/onboarding";

export const athleteOnboardingModules: OnboardingModuleDefinition[] = [
  {
    id: "athlete-first-login",
    role: "athlete",
    type: "intro",
    version: "1",
    priority: 100,
    routePatterns: ["/athletes/[id]"],
    dismissible: true,
    conditions: {
      requiresAuth: true,
      requiresLinkedAthlete: true
    },
    steps: [
      {
        id: "athlete-home"
      }
    ]
  },
  {
    id: "athlete-first-checkin",
    role: "athlete",
    type: "checklist",
    version: "1",
    priority: 95,
    routePatterns: ["/athletes/[id]", "/dashboard/assessment"],
    completionEvent: "athlete.checkin_saved",
    dismissible: true,
    conditions: {
      requiresAuth: true,
      requiresLinkedAthlete: true
    },
    steps: [
      {
        id: "open-checkin"
      },
      {
        id: "save-checkin"
      }
    ]
  },
  {
    id: "athlete-habit-tracker",
    role: "athlete",
    type: "checklist",
    version: "1",
    priority: 85,
    routePatterns: ["/athletes/[id]"],
    prerequisites: ["athlete-first-checkin"],
    completionEvent: "athlete.habit_saved",
    dismissible: true,
    conditions: {
      requiresAuth: true,
      requiresLinkedAthlete: true
    },
    steps: [
      {
        id: "open-habits"
      },
      {
        id: "save-habits"
      }
    ]
  }
];
