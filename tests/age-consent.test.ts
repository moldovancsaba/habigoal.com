import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateAgeYears,
  requiresGuardianConsent,
  isMinorAthlete,
  resolveGuardianRequirement,
} from "@/lib/age-consent";
import { YOUTH_AGE_THRESHOLD } from "@/lib/consent";

// Pin "now" so age maths is deterministic regardless of when the suite runs.
const NOW = new Date("2026-06-15T12:00:00.000Z");

// Build a birthDate (YYYY-MM-DD) for someone who is exactly `age` years old today.
function birthDateForAge(age: number): string {
  const y = NOW.getUTCFullYear() - age;
  return `${y}-06-15`;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("age-consent age maths (GH-206)", () => {
  it("returns null for empty or invalid birth dates", () => {
    expect(calculateAgeYears("")).toBeNull();
    expect(calculateAgeYears("not-a-date")).toBeNull();
  });

  it("computes whole-year age, accounting for birthdays not yet reached", () => {
    expect(calculateAgeYears(birthDateForAge(20))).toBe(20);
    // Birthday tomorrow -> still one year younger today.
    expect(calculateAgeYears("2010-06-16")).toBe(15);
    // Birthday yesterday -> already had it this year.
    expect(calculateAgeYears("2010-06-14")).toBe(16);
  });
});

describe("requiresGuardianConsent threshold (GH-206)", () => {
  it("requires guardian consent strictly below the youth threshold", () => {
    expect(requiresGuardianConsent(birthDateForAge(YOUTH_AGE_THRESHOLD - 1))).toBe(true);
  });

  it("does not require guardian consent at or above the youth threshold", () => {
    expect(requiresGuardianConsent(birthDateForAge(YOUTH_AGE_THRESHOLD))).toBe(false);
    expect(requiresGuardianConsent(birthDateForAge(YOUTH_AGE_THRESHOLD + 5))).toBe(false);
  });
});

describe("isMinorAthlete (GH-206)", () => {
  it("treats under-18 as minors and 18+ as adults", () => {
    expect(isMinorAthlete(birthDateForAge(17))).toBe(true);
    expect(isMinorAthlete(birthDateForAge(18))).toBe(false);
  });
});

describe("resolveGuardianRequirement enforces age rules server-side (GH-206)", () => {
  const minor = birthDateForAge(YOUTH_AGE_THRESHOLD - 1);
  const adult = birthDateForAge(YOUTH_AGE_THRESHOLD + 2);

  it("forces guardian consent for a minor even when the caller requests false", () => {
    expect(resolveGuardianRequirement(minor, false)).toBe(true);
    expect(resolveGuardianRequirement(minor, undefined)).toBe(true);
  });

  it("lets a caller strengthen the requirement for an adult", () => {
    expect(resolveGuardianRequirement(adult, true)).toBe(true);
  });

  it("does not require guardian consent for an adult by default", () => {
    expect(resolveGuardianRequirement(adult, false)).toBe(false);
    expect(resolveGuardianRequirement(adult, undefined)).toBe(false);
  });

  it("defaults to no requirement when the birth date is unknown", () => {
    expect(resolveGuardianRequirement(null, undefined)).toBe(false);
    expect(resolveGuardianRequirement(undefined, false)).toBe(false);
  });
});
