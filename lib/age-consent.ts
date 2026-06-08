import { YOUTH_AGE_THRESHOLD } from "@/lib/consent";

export function calculateAgeYears(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function requiresGuardianConsent(birthDate: string): boolean {
  const age = calculateAgeYears(birthDate);
  return age != null && age < YOUTH_AGE_THRESHOLD;
}

export function isMinorAthlete(birthDate: string): boolean {
  const age = calculateAgeYears(birthDate);
  return age != null && age < 18;
}
