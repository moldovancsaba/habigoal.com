import { describe, expect, it } from "vitest";
import { DEFAULT_HABIGOAL_SETTINGS } from "../services/settings-service";
import { parseAssessmentPayload } from "../lib/validations";
import { checkInNotesFields, checkInSetupFields, trainingLoadFields, validateCentralForm } from "../lib/forms/central-form";

describe("standards governance defaults", () => {
  it("has active standards version and metadata", () => {
    expect(DEFAULT_HABIGOAL_SETTINGS.standards.activeVersion).toBeTruthy();
    const active = DEFAULT_HABIGOAL_SETTINGS.standards.activeVersion;
    expect(DEFAULT_HABIGOAL_SETTINGS.standards.versions[active]).toBeTruthy();
    expect(DEFAULT_HABIGOAL_SETTINGS.standards.versions[active].meta?.status).toBe("published");
  });
});

describe("assessment payload integrity baseline", () => {
  it("parses child link and consent flags", () => {
    const payload = parseAssessmentPayload({
      childId: "abc",
      mode: "rapid",
      child: { name: "A", birthDate: "2020-01-01", ageGroup: "7-9" },
      session: { date: "2026-01-01", context: "event", consentPhoto: true, consentReport: false },
      scores: {},
      notes: {},
      attachments: []
    });
    expect(payload.childId).toBe("abc");
    expect(payload.session.consentReport).toBe(false);
  });
});

describe("central form governance", () => {
  it("keeps check-in setup, training load, and notes fields centrally defined", () => {
    expect(checkInSetupFields.map((field) => field.key)).toEqual(["childId", "date"]);
    expect(trainingLoadFields.map((field) => field.key)).toEqual(["sessionType", "durationMinutes", "rpe", "externalLoad"]);
    expect(checkInNotesFields.map((field) => field.key)).toEqual(["general"]);
  });

  it("keeps central form field keys unique within each field group", () => {
    for (const fields of [checkInSetupFields, trainingLoadFields, checkInNotesFields]) {
      const keys = fields.map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("validates required central form fields with translated labels", () => {
    const errors = validateCentralForm({
      fields: checkInSetupFields,
      values: { childId: "", date: "" },
      translate: (key, params) => {
        if (key === "childName") return "Athlete name";
        if (key === "date") return "Date";
        if (key === "requiredField") return `${params?.field} is required.`;
        return key;
      }
    });

    expect(errors).toEqual({
      childId: "Athlete name is required.",
      date: "Date is required."
    });
  });

  it("does not require optional central form fields", () => {
    const errors = validateCentralForm({
      fields: trainingLoadFields,
      values: { sessionType: "", durationMinutes: undefined, rpe: undefined, externalLoad: undefined },
      translate: (key) => key
    });

    expect(errors).toEqual({});
  });
});
