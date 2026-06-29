import type { AuthUser } from "@/lib/access";
import type { OnboardingEventRecord, OnboardingEventType, OnboardingModule, OnboardingModuleState, OnboardingModuleView } from "@/types/onboarding";

export const ONBOARDING_MODULES: OnboardingModule[] = [
  {
    id: "athlete-first-login-baseline",
    role: "athlete",
    routePattern: "/athletes",
    priority: 10,
    title: "Set up your athlete baseline",
    body: "Confirm your weekly goal and support preferences so Habigoal can explain readiness and check-in context clearly.",
    checklistTitle: "Athlete setup",
    steps: [
      { id: "open-profile", title: "Open your athlete profile", body: "Start from your own athlete profile only.", completionEvent: "profile-opened" },
      { id: "complete-check-in", title: "Complete a daily check-in", body: "Submit today's readiness so your trend context is based on real data.", completionEvent: "check-in-completed" }
    ]
  },
  {
    id: "trainer-command-center",
    role: "trainer",
    routePattern: "/dashboard",
    priority: 20,
    title: "Review your coach dashboard",
    body: "Use the priority queue, missed check-ins, recommendations, and planning context before making session decisions.",
    checklistTitle: "Trainer workflow",
    steps: [
      { id: "review-queue", title: "Review priority athletes", body: "Start with support and missed-check-in athletes." },
      { id: "save-plan", title: "Save a weekly plan", body: "Use planning to translate readiness into session constraints.", completionEvent: "planning-saved" }
    ]
  },
  {
    id: "admin-settings-foundation",
    role: "admin",
    routePattern: "/dashboard/settings",
    priority: 30,
    title: "Complete admin setup",
    body: "Review users, teams, standards, restore controls, and governance metrics before inviting operators into live workflows.",
    checklistTitle: "Admin setup",
    steps: [
      { id: "review-users", title: "Review approved users", body: "Confirm at least one admin remains active." },
      { id: "review-teams", title: "Review team membership", body: "Trainer access depends on team membership." }
    ]
  }
];

export function normalizeOnboardingRoute(route: string) {
  return route.replace(/^\/(en|hu|ar|es|de|he)(?=\/|$)/, "") || "/";
}

export function routeMatchesModule(route: string, module: OnboardingModule) {
  const normalizedRoute = normalizeOnboardingRoute(route);
  return normalizedRoute === module.routePattern || normalizedRoute.startsWith(`${module.routePattern}/`);
}

export function canAccessOnboardingModule(user: AuthUser, module: OnboardingModule, route: string) {
  return user.roles.includes(module.role) && routeMatchesModule(route, module);
}

function stateFromEvents(module: OnboardingModule, events: OnboardingEventRecord[]): { state: OnboardingModuleState; lastEventAt?: string; completedStepIds: string[] } {
  const completedStepIds = Array.from(new Set(events.filter((event) => event.event === "completed" && event.stepId).map((event) => event.stepId!)));
  const completableStepIds = module.steps.filter((step) => step.completionEvent).map((step) => step.id);
  const lastStepEvent = events.filter((event) => event.stepId).at(-1);
  const lastModuleEvent = events.filter((event) => !event.stepId).at(-1);

  if (completableStepIds.length > 0 && completableStepIds.every((stepId) => completedStepIds.includes(stepId))) {
    return { state: "completed", lastEventAt: lastStepEvent?.createdAt ?? lastModuleEvent?.createdAt, completedStepIds };
  }

  if (!lastModuleEvent) return { state: "eligible", lastEventAt: lastStepEvent?.createdAt, completedStepIds };
  if (lastModuleEvent.event === "completed") return { state: "completed", lastEventAt: lastModuleEvent.createdAt, completedStepIds };
  return { state: lastModuleEvent.event as OnboardingModuleState, lastEventAt: lastModuleEvent.createdAt, completedStepIds };
}

export function resolveOnboardingModules(user: AuthUser, route: string, events: OnboardingEventRecord[]): OnboardingModuleView[] {
  return ONBOARDING_MODULES
    .filter((module) => canAccessOnboardingModule(user, module, route))
    .sort((a, b) => a.priority - b.priority)
    .map((module) => {
      const moduleEvents = events.filter((event) => event.moduleId === module.id);
      return {
        ...module,
        ...stateFromEvents(module, moduleEvents)
      };
    });
}

export function isOnboardingEventType(value: unknown): value is OnboardingEventType {
  return value === "shown" || value === "dismissed" || value === "snoozed" || value === "completed" || value === "failed";
}
