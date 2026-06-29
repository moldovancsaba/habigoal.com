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

/**
 * Resolves the authoritative guardian-consent requirement for an athlete (#206
 * PRV-002). Age-based rules are enforced server-side: an athlete below the youth
 * digital-consent threshold ALWAYS requires guardian consent. A caller-supplied
 * override can only strengthen the requirement (force a guardian) — it can never
 * waive the age rule, so a minor can't be downgraded by passing
 * `guardianRequired: false`.
 */
export function resolveGuardianRequirement(
  birthDate: string | null | undefined,
  requested?: boolean
): boolean {
  const ageMandates = birthDate ? requiresGuardianConsent(birthDate) : false;
  return ageMandates || requested === true;
}
