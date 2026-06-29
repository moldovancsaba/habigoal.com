import { describe, expect, it } from "vitest";
import {
  validateContract,
  isValidationOk,
  getFormContract,
  FORM_CONTRACTS,
} from "@/lib/forms/validation";
import { trainingLoadFields, athleteProfileFields } from "@/lib/forms/central-form";

describe("validateContract — cross-layer gateway (#153)", () => {
  it("flags a missing required field with the required code", () => {
    const errors = validateContract(athleteProfileFields, { position: "GK", status: "" });
    expect(errors).toContainEqual({ field: "status", code: "required", messageKey: "form.error.required" });
  });

  it("skips type/range checks for an absent optional field", () => {
    const errors = validateContract(trainingLoadFields, {});
    expect(isValidationOk(errors)).toBe(true);
  });

  it("reports invalid_type for a non-numeric number field", () => {
    const errors = validateContract(trainingLoadFields, { rpe: "high" });
    expect(errors).toContainEqual({ field: "rpe", code: "invalid_type", messageKey: "form.error.invalidType" });
  });

  it("reports out_of_range for a number outside its bounds", () => {
    const low = validateContract(trainingLoadFields, { rpe: 0 });
    const high = validateContract(trainingLoadFields, { rpe: 11 });
    expect(low).toContainEqual({ field: "rpe", code: "out_of_range", messageKey: "form.error.outOfRange" });
    expect(high).toContainEqual({ field: "rpe", code: "out_of_range", messageKey: "form.error.outOfRange" });
  });

  it("reports invalid_type for a select value outside its options", () => {
    const errors = validateContract(athleteProfileFields, { status: "retired" });
    expect(errors).toContainEqual({ field: "status", code: "invalid_type", messageKey: "form.error.invalidType" });
  });

  it("reports out_of_range for an over-long text field", () => {
    const errors = validateContract(athleteProfileFields, { status: "active", position: "x".repeat(81) });
    expect(errors).toContainEqual({ field: "position", code: "out_of_range", messageKey: "form.error.outOfRange" });
  });

  it("accepts a fully valid payload", () => {
    const errors = validateContract(trainingLoadFields, {
      sessionType: "team",
      durationMinutes: 60,
      rpe: 7,
      externalLoad: 1200,
    });
    expect(isValidationOk(errors)).toBe(true);
  });
});

describe("form contract registry (#153)", () => {
  it("resolves known forms and rejects unknown ones", () => {
    expect(getFormContract("athlete.profile")).toBe(athleteProfileFields);
    expect(getFormContract("training.load")).toBe(trainingLoadFields);
    expect(getFormContract("does.not.exist")).toBeNull();
  });

  it("exposes a stable set of form ids", () => {
    expect(Object.keys(FORM_CONTRACTS).sort()).toEqual([
      "athlete.profile",
      "checkin.notes",
      "checkin.setup",
      "training.load",
    ]);
  });
});
