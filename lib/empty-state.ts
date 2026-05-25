export type EmptyStateReason = "no_records" | "missing_permission" | "load_failed" | "partial_data" | "not_onboarded";
export type EmptyStateRole = "athlete" | "trainer" | "admin";

export type EmptyStateAction = {
  labelKey: string;
  href?: string;
  role: EmptyStateRole;
};

export function getAthleteEmptyStateAction(input: {
  role: EmptyStateRole;
  reason: EmptyStateReason;
  athleteId?: string;
}): EmptyStateAction | null {
  if (input.reason === "missing_permission" || input.reason === "load_failed") return null;

  if (input.reason === "no_records" || input.reason === "not_onboarded" || input.reason === "partial_data") {
    return {
      labelKey: "newSurveyForChild",
      href: input.athleteId ? `/dashboard/assessment?childId=${input.athleteId}` : "/dashboard/assessment",
      role: input.role
    };
  }

  return null;
}
