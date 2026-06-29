import { describe, expect, it } from "vitest";
import {
  athleteProfileFields,
  ATHLETE_PROFILE_STATUSES,
  ATHLETE_PROFILE_FIELD_LIMITS,
  isAthleteProfileStatus,
  validateCentralForm,
  type AthleteProfileFormValues,
} from "@/lib/forms/central-form";

describe("athlete profile single-source contract (#150)", () => {
  it("exposes every editable profile field once", () => {
    expect(athleteProfileFields.map((f) => f.key)).toEqual([
      "position",
      "status",
      "teamId",
      "season",
      "parentGuardianEmail",
    ]);
  });

  it("derives status options from the shared enum", () => {
    const status = athleteProfileFields.find((f) => f.key === "status");
    expect(status?.options?.map((o) => o.value)).toEqual([...ATHLETE_PROFILE_STATUSES]);
    expect(status?.required).toBe(true);
  });

  it("advertises the same length caps the server enforces", () => {
    const position = athleteProfileFields.find((f) => f.key === "position");
    const season = athleteProfileFields.find((f) => f.key === "season");
    expect(position?.max).toBe(ATHLETE_PROFILE_FIELD_LIMITS.position);
    expect(season?.max).toBe(ATHLETE_PROFILE_FIELD_LIMITS.season);
  });
});

describe("isAthleteProfileStatus (#150)", () => {
  it("accepts known statuses and rejects everything else", () => {
    expect(isAthleteProfileStatus("active")).toBe(true);
    expect(isAthleteProfileStatus("archived")).toBe(true);
    expect(isAthleteProfileStatus("retired")).toBe(false);
    expect(isAthleteProfileStatus(undefined)).toBe(false);
    expect(isAthleteProfileStatus(42)).toBe(false);
  });
});

describe("validateCentralForm over the profile contract (#150)", () => {
  const translate = (key: string, params?: Record<string, string>) =>
    key === "requiredField" ? `Required: ${params?.field ?? ""}` : key;

  it("flags a missing required status", () => {
    const values = {
      position: "GK",
      status: "" as AthleteProfileFormValues["status"],
      teamId: "",
      season: "2025/26",
      parentGuardianEmail: "",
    };
    const errors = validateCentralForm({ fields: athleteProfileFields, values, translate });
    expect(errors.status).toBeTruthy();
    expect(errors.position).toBeUndefined();
  });

  it("passes when the required field is present", () => {
    const values: AthleteProfileFormValues = {
      position: "GK",
      status: "active",
      teamId: "",
      season: "",
      parentGuardianEmail: "",
    };
    const errors = validateCentralForm({ fields: athleteProfileFields, values, translate });
    expect(errors).toEqual({});
  });
});
