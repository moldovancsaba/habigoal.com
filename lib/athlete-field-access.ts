import type { ChildProfile } from "@/repositories/child.repository";
import { canViewInjuryFlags, canViewMedicalNotes } from "@/lib/permissions";

export function filterAthleteProfileForRoles(
  profile: ChildProfile,
  roles: string[]
): Partial<ChildProfile> {
  const filtered: ChildProfile = { ...profile };

  if (!canViewInjuryFlags(roles)) {
    delete (filtered as Partial<ChildProfile>).injuryHistoryFlags;
  }

  if (!canViewMedicalNotes(roles) && filtered.baselineProfile) {
    filtered.baselineProfile = {
      ...filtered.baselineProfile,
      medicalNotes: undefined,
      injuryNotes: undefined,
    };
  }

  return filtered;
}

export function isActiveAthleteStatus(status?: string): boolean {
  return !status || status === "active" || status === "trialist";
}
