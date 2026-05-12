"use client";

import { createContext, useContext, useMemo } from "react";
import type { OnboardingStateRecord } from "@/types/onboarding";

type OnboardingContextValue = {
  state: OnboardingStateRecord | null;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  state: null
});

export function OnboardingProvider({
  children,
  state
}: {
  children: React.ReactNode;
  state?: OnboardingStateRecord | null;
}) {
  const value = useMemo(() => ({ state: state ?? null }), [state]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
