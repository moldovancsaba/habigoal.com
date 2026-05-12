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
        id: "athlete-home",
        title: "Welcome to your athlete workspace",
        body: "This space is your personal daily operating view for check-ins, habits, trends, and weekly summaries."
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
        id: "open-checkin",
        title: "Open the daily check-in",
        body: "Start your readiness check-in from your athlete profile."
      },
      {
        id: "save-checkin",
        title: "Save your first check-in",
        body: "Complete and save one daily check-in so your trends and summaries can begin."
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
        id: "open-habits",
        title: "Open your habit tracker",
        body: "Review the daily routine blocks for training, learning, recovery, and wellness."
      },
      {
        id: "save-habits",
        title: "Save your first habit update",
        body: "Log one daily habit update so Habigoal can start building your routine trend."
      }
    ]
  }
];
