import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/athleteiq/check-ins/route";
import { GET as getSchema } from "@/app/api/athleteiq/check-ins/schema/route";
import { buildAthleteIqCheckInSnapshot, getAthleteIqCheckInSchema, normalizeTenPointValue } from "@/lib/athleteiq-check-in";

describe("AthleteIQ adaptive check-in contract", () => {
  it("normalizes 1-10 values to 0-100 without computing Daily IQ", () => {
    expect(normalizeTenPointValue(1)).toBe(0);
    expect(normalizeTenPointValue(10)).toBe(100);
    expect(normalizeTenPointValue(5)).toBe(44);
  });

  it("keeps lifestyle schema to required wellness fields plus note", () => {
    const schema = getAthleteIqCheckInSchema("lifestyle");

    expect(schema.requiredFields).toEqual(["sleepQuality", "fatigue", "pain", "stress", "mood"]);
    expect(schema.fields.map((field) => field.key)).toEqual(["sleepQuality", "fatigue", "pain", "stress", "mood", "note"]);
  });

  it("extends performance schema with optional manual and source-labeled fields", () => {
    const schema = getAthleteIqCheckInSchema("performance");

    expect(schema.requiredFields).toEqual(["sleepQuality", "fatigue", "pain", "stress", "mood"]);
    expect(schema.fields.map((field) => field.key)).toContain("manualHrv");
    expect(schema.fields.map((field) => field.key)).toContain("deviceSourceStatus");
  });

  it("builds a valid performance snapshot with raw values, normalized values, and source labels", () => {
    const result = buildAthleteIqCheckInSnapshot({
      athleteId: "athlete-1",
      mode: "performance",
      timezone: "Europe/Budapest",
      values: {
        sleepQuality: 8,
        fatigue: 4,
        pain: 8,
        stress: 3,
        mood: 7,
        confidence: 6,
        sorenessAreas: ["left calf"],
        manualHrv: 72,
        deviceSourceStatus: "manual"
      }
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(result.errors).toEqual([]);
    expect(result.highPain).toBe(true);
    expect(result.snapshot).toMatchObject({
      athleteId: "athlete-1",
      mode: "performance",
      localDate: "2026-06-26",
      timezone: "Europe/Budapest",
      missingFields: []
    });
    expect(result.snapshot?.values.sleepQuality).toEqual({ rawValue: 8, normalizedValue: 78, sourceLabel: "user_input" });
    expect(result.snapshot?.values.manualHrv).toEqual({ rawValue: 72, normalizedValue: null, sourceLabel: "manual_entry" });
  });

  it("persists missing required fields as validation errors instead of imputing", () => {
    const result = buildAthleteIqCheckInSnapshot({
      athleteId: "athlete-1",
      mode: "lifestyle",
      values: { sleepQuality: 7, fatigue: 4 }
    });

    expect(result.snapshot).toBeUndefined();
    expect(result.errors).toContain("missing required fields: pain, stress, mood");
  });
});

describe("AthleteIQ adaptive check-in API", () => {
  it("returns schema metadata for performance mode", async () => {
    const response = await getSchema(new Request("http://localhost/api/athleteiq/check-ins/schema?mode=performance"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("performance");
    expect(payload.fields.map((field: { key: string }) => field.key)).toContain("trainingLoad");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("returns structured validation errors before persistence", async () => {
    const response = await POST(new Request("http://localhost/api/athleteiq/check-ins", {
      method: "POST",
      body: JSON.stringify({ mode: "lifestyle", values: { sleepQuality: 5 } })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: "VALIDATION_ERROR",
      messageKey: "athleteiq.errors.VALIDATION_ERROR",
      retryable: false
    });
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});
