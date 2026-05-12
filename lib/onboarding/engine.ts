import { onboardingDefinitions } from "@/lib/onboarding/registry";
import {
  createDefaultOnboardingState
} from "@/lib/onboarding/default-state";
import type { OnboardingEngineInput, OnboardingModuleDefinition, OnboardingStatePatch, OnboardingStateRecord } from "@/types/onboarding";

function normalizePathname(pathname: string) {
  return pathname.replace(/^\/(hu|en|ar|es|de|he)(?=\/|$)/, "") || "/";
}

function matchRoutePattern(pathname: string, pattern: string) {
  const normalizedPath = normalizePathname(pathname);
  const regex = new RegExp(
    `^${pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\[id\\\]/g, "[^/]+")
      .replace(/\\\[slug\\\]/g, "[^/]+")}$`
  );
  return regex.test(normalizedPath);
}

function moduleAllowed(definition: OnboardingModuleDefinition, input: OnboardingEngineInput) {
  if (definition.role !== "shared" && definition.role !== input.role) {
    return false;
  }

  if (!definition.routePatterns.some((pattern) => matchRoutePattern(input.pathname, pattern))) {
    return false;
  }

  if (input.state.completedModules.includes(definition.id) || input.state.dismissedModules.includes(definition.id)) {
    return false;
  }

  if (definition.prerequisites?.some((prerequisite) => !input.state.completedModules.includes(prerequisite))) {
    return false;
  }

  const conditions = definition.conditions;
  if (!conditions) {
    return true;
  }

  if (conditions.requiresAuth && !input.isAuthenticated) {
    return false;
  }
  if (conditions.requiresLinkedAthlete && !input.hasLinkedAthlete) {
    return false;
  }
  if (conditions.requiresTeamMembership && !input.hasTeamMembership) {
    return false;
  }
  if (conditions.requiresEmptyState && !input.isEmptyState) {
    return false;
  }

  return true;
}

export function getEligibleOnboardingModules(input: OnboardingEngineInput) {
  return onboardingDefinitions
    .filter((definition) => moduleAllowed(definition, input))
    .sort((a, b) => b.priority - a.priority);
}

export function getNextOnboardingModule(input: OnboardingEngineInput) {
  return getEligibleOnboardingModules(input)[0] ?? null;
}

export function applyOnboardingStatePatch(
  current: OnboardingStateRecord | null,
  userEmail: string,
  patch: OnboardingStatePatch
) {
  const next = current ?? createDefaultOnboardingState(userEmail);

  if (patch.action === "complete") {
    next.completedModules = Array.from(new Set([...next.completedModules, patch.moduleId]));
    next.dismissedModules = next.dismissedModules.filter((item) => item !== patch.moduleId);
  }

  if (patch.action === "dismiss") {
    next.dismissedModules = Array.from(new Set([...next.dismissedModules, patch.moduleId]));
  }

  if (patch.action === "seen-release") {
    next.seenReleaseVersions = Array.from(new Set([...next.seenReleaseVersions, patch.version]));
  }

  if (patch.action === "checklist-step") {
    next.checklistProgress = {
      ...next.checklistProgress,
      [patch.moduleId]: Array.from(new Set([...(next.checklistProgress[patch.moduleId] ?? []), patch.stepId]))
    };
  }

  next.updatedAt = new Date().toISOString();
  return next;
}
