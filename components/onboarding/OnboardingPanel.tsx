"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getNextOnboardingModule } from "@/lib/onboarding/engine";
import { OnboardingChecklistCard } from "@/components/onboarding/OnboardingChecklistCard";
import { OnboardingModuleCard } from "@/components/onboarding/OnboardingModuleCard";
import { OnboardingReleaseCard } from "@/components/onboarding/OnboardingReleaseCard";
import type { OnboardingModuleDefinition, OnboardingReleasePrompt, OnboardingRole, OnboardingStatePatch, OnboardingStateRecord } from "@/types/onboarding";

type AuthMeUser = {
  email: string;
  primaryRole?: OnboardingRole;
  athleteId?: string;
  teamIds?: string[];
};

type OnboardingStatePayload = {
  state: OnboardingStateRecord;
  releasePrompt?: OnboardingReleasePrompt | null;
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
  const locale = useLocale();
  const [authUser, setAuthUser] = useState<AuthMeUser | null>(null);
  const [state, setState] = useState<OnboardingStateRecord | null>(null);
  const [releasePrompt, setReleasePrompt] = useState<OnboardingReleasePrompt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((response) => response.json()).catch(() => null),
      fetch(`/api/onboarding/state?locale=${encodeURIComponent(locale)}`).then((response) => response.json()).catch(() => null)
    ])
      .then(([authPayload, statePayload]) => {
        setAuthUser(authPayload?.user ?? null);
        setState(statePayload?.state ?? null);
        setReleasePrompt(statePayload?.releasePrompt ?? null);
      })
      .finally(() => setLoading(false));
  }, [locale]);

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

    const shouldMarkOpenAthleteRoster =
      nextModule.id === "trainer-athlete-management" &&
      pathname.includes("/dashboard/athletes") &&
      !pathname.includes("/dashboard/athletes/") &&
      !state.checklistProgress[nextModule.id]?.includes("open-athlete-roster");

    const shouldMarkOpenPlanning =
      nextModule.id === "trainer-planning-week" &&
      pathname.includes("/dashboard/planning") &&
      !state.checklistProgress[nextModule.id]?.includes("open-planning");

    const shouldMarkOpenAdminSettings =
      nextModule.id === "admin-user-rights" &&
      pathname.includes("/dashboard/settings") &&
      !state.checklistProgress[nextModule.id]?.includes("open-settings");

    const shouldMarkOpenTeamSetup =
      nextModule.id === "admin-team-setup" &&
      pathname.includes("/dashboard/settings") &&
      !state.checklistProgress[nextModule.id]?.includes("open-team-setup");

    const shouldMarkOpenGovernance =
      nextModule.id === "admin-governance-review" &&
      pathname.includes("/dashboard/settings") &&
      !state.checklistProgress[nextModule.id]?.includes("open-governance");

    if (!shouldMarkOpenCheckin && !shouldMarkOpenHabits && !shouldMarkOpenAthleteRoster && !shouldMarkOpenPlanning && !shouldMarkOpenAdminSettings && !shouldMarkOpenTeamSetup && !shouldMarkOpenGovernance) {
      return;
    }

    const stepId =
      shouldMarkOpenCheckin ? "open-checkin" :
      shouldMarkOpenHabits ? "open-habits" :
      shouldMarkOpenAthleteRoster ? "open-athlete-roster" :
      shouldMarkOpenPlanning ? "open-planning" :
      shouldMarkOpenAdminSettings ? "open-settings" :
      shouldMarkOpenTeamSetup ? "open-team-setup" :
      "open-governance";

    void postStatePatch({
      action: "checklist-step",
      moduleId: nextModule.id,
      stepId
    }).then((nextState) => {
      if (nextState) setState(nextState);
    });
  }, [nextModule, pathname, state]);

  if (loading || !nextModule || !state) {
    if (loading || !state || !releasePrompt) {
      return null;
    }
  }

  async function dismissModule(moduleId: string) {
    const nextState = await postStatePatch({
      action: "dismiss",
      moduleId
    });
    if (nextState) setState(nextState);
  }

  async function markReleaseSeen(version: string) {
    const nextState = await postStatePatch({
      action: "seen-release",
      version
    });
    if (nextState) {
      setState(nextState);
      setReleasePrompt(null);
    }
  }

  if (!nextModule && releasePrompt) {
    return <OnboardingReleaseCard prompt={releasePrompt} onSeen={markReleaseSeen} />;
  }

  if (!nextModule || !state) {
    return null;
  }

  return nextModule.type === "checklist" ? (
    <OnboardingChecklistCard module={nextModule} progress={state.checklistProgress} onDismiss={dismissModule} />
  ) : (
    <OnboardingModuleCard module={nextModule} onDismiss={dismissModule} />
  );
}
