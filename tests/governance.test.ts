import { describe, expect, it } from "vitest";
import { DEFAULT_KIDEX_SETTINGS } from "../services/settings-service";
import { parseAssessmentPayload } from "../lib/validations";

describe("standards governance defaults", () => {
  it("has active standards version and metadata", () => {
    expect(DEFAULT_KIDEX_SETTINGS.standards.activeVersion).toBeTruthy();
    const active = DEFAULT_KIDEX_SETTINGS.standards.activeVersion;
    expect(DEFAULT_KIDEX_SETTINGS.standards.versions[active]).toBeTruthy();
    expect(DEFAULT_KIDEX_SETTINGS.standards.versions[active].meta?.status).toBe("published");
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
