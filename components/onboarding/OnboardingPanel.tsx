"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { getNextOnboardingModule } from "@/lib/onboarding/engine";
import { OnboardingChecklistCard } from "@/components/onboarding/OnboardingChecklistCard";
import { OnboardingModuleCard } from "@/components/onboarding/OnboardingModuleCard";
import type { OnboardingModuleDefinition, OnboardingRole, OnboardingStatePatch, OnboardingStateRecord } from "@/types/onboarding";

type AuthMeUser = {
  email: string;
  primaryRole?: OnboardingRole;
  athleteId?: string;
  teamIds?: string[];
};

type OnboardingStatePayload = {
  state: OnboardingStateRecord;
};

async function postStatePatch(patch: OnboardingStatePatch) {
  const response = await fetch("/api/onboarding/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as OnboardingStatePayload | null;
  return payload?.state ?? null;
}

export function OnboardingPanel({
  isEmptyState = false
}: {
  isEmptyState?: boolean;
}) {
  const pathname = usePathname();
  const [authUser, setAuthUser] = useState<AuthMeUser | null>(null);
  const [state, setState] = useState<OnboardingStateRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((response) => response.json()).catch(() => null),
      fetch("/api/onboarding/state").then((response) => response.json()).catch(() => null)
    ])
      .then(([authPayload, statePayload]) => {
        setAuthUser(authPayload?.user ?? null);
        setState(statePayload?.state ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const nextModule = useMemo<OnboardingModuleDefinition | null>(() => {
    if (!authUser?.primaryRole || !state) return null;
    return getNextOnboardingModule({
      role: authUser.primaryRole,
      pathname,
      state,
      hasLinkedAthlete: Boolean(authUser.athleteId),
      hasTeamMembership: Boolean(authUser.teamIds?.length),
      isEmptyState,
      isAuthenticated: true
    });
  }, [authUser, isEmptyState, pathname, state]);

  useEffect(() => {
    if (!nextModule || !state) return;

    const shouldMarkOpenCheckin =
      nextModule.id === "athlete-first-checkin" &&
      pathname.includes("/dashboard/assessment") &&
      !state.checklistProgress[nextModule.id]?.includes("open-checkin");

    const shouldMarkOpenHabits =
      nextModule.id === "athlete-habit-tracker" &&
      pathname.includes("/athletes/") &&
      !pathname.includes("/dashboard/athletes/") &&
      !state.checklistProgress[nextModule.id]?.includes("open-habits");

    if (!shouldMarkOpenCheckin && !shouldMarkOpenHabits) {
      return;
    }

    const stepId = shouldMarkOpenCheckin ? "open-checkin" : "open-habits";
    void postStatePatch({
      action: "checklist-step",
      moduleId: nextModule.id,
      stepId
    }).then((nextState) => {
      if (nextState) setState(nextState);
    });
  }, [nextModule, pathname, state]);

  if (loading || !nextModule || !state) {
    return null;
  }

  async function dismissModule(moduleId: string) {
    const nextState = await postStatePatch({
      action: "dismiss",
      moduleId
    });
    if (nextState) setState(nextState);
  }

  return nextModule.type === "checklist" ? (
    <OnboardingChecklistCard module={nextModule} progress={state.checklistProgress} onDismiss={dismissModule} />
  ) : (
    <OnboardingModuleCard module={nextModule} onDismiss={dismissModule} />
  );
}
