import { describe, expect, it } from "vitest";
import { POST as postManualWearable } from "@/app/api/athleteiq/wearables/manual-entry/route";
import {
  buildLiteModuleGatewaySummary,
  buildManualWearableEntry,
  buildRecoveryLiteEntry,
  listLiteModuleCapabilities,
  validateLiteModuleEntryRequest,
  validateLiteModuleSummaryClaimBoundaries
} from "@/lib/athleteiq-lite-modules";

describe("AthleteIQ lite module gateway contract", () => {
  it("lists lite/manual modules with manual source and planned integration boundaries", () => {
    const capabilities = listLiteModuleCapabilities();

    expect(capabilities.map((capability) => capability.moduleKey)).toEqual([
      "recovery_lite",
      "fuel_lite",
      "learning_lite",
      "wearable_manual_sync"
    ]);
    expect(capabilities.every((capability) => capability.source === "manual")).toBe(true);
    expect(capabilities.find((capability) => capability.moduleKey === "wearable_manual_sync")?.missingData).toContain("wearable_normalisation");
  });

  it("validates manual recovery entries and builds source-labelled records", () => {
    const body = {
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      protocolKey: "breathing-reset",
      perceivedRecovery: 4,
      completedAt: "2026-06-26T07:30:00.000Z"
    };

    expect(validateLiteModuleEntryRequest("recovery_lite", body).errors).toEqual([]);
    const entry = buildRecoveryLiteEntry({ body, actorEmail: "coach@example.com", now: new Date("2026-06-26T08:00:00.000Z") });

    expect(entry.source).toBe("manual");
    expect(entry.moduleStatus).toBe("manual_available");
    expect(entry.claimBoundary).toBe("backed_by_manual_entry");
    expect(entry.dataUsed).toEqual(["manual_daily_entry"]);
  });

  it("accepts wearable-style manual outliers as warnings without claiming device integration", () => {
    const body = {
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      metricKey: "resting_heart_rate",
      value: 120,
      unit: "bpm",
      measuredAt: "2026-06-26T07:30:00.000Z"
    };
    const validation = validateLiteModuleEntryRequest("wearable_manual_sync", body);
    const entry = buildManualWearableEntry({ body, actorEmail: "athlete@example.com", warnings: validation.warnings });

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toContain("manual_wearable_outlier:resting_heart_rate");
    expect(entry.deviceConnectionClaim).toBe(false);
    expect(entry.integrationStatus).toBe("not_connected_manual_only");
    expect(entry.missingData).toContain("wearable_normalisation");
  });

  it("builds plan/report summaries without future or automated integration claims", () => {
    const recovery = buildRecoveryLiteEntry({
      body: {
        athleteId: "athlete-1",
        localDate: "2026-06-26",
        protocolKey: "mobility-reset",
        perceivedRecovery: 3,
        completedAt: "2026-06-26T07:30:00.000Z"
      },
      actorEmail: "athlete@example.com",
      now: new Date("2026-06-26T08:00:00.000Z")
    });
    const wearable = buildManualWearableEntry({
      body: {
        athleteId: "athlete-1",
        localDate: "2026-06-26",
        metricKey: "sleep_hours",
        value: 2.5,
        unit: "h",
        measuredAt: "2026-06-26T06:30:00.000Z"
      },
      actorEmail: "athlete@example.com",
      warnings: ["manual_wearable_outlier:sleep_hours"],
      now: new Date("2026-06-26T08:05:00.000Z")
    });

    const summary = buildLiteModuleGatewaySummary({ athleteId: "athlete-1", localDate: "2026-06-26", entries: [recovery, wearable] });

    expect(validateLiteModuleSummaryClaimBoundaries(summary)).toEqual([]);
    expect(summary.summaries.find((item) => item.moduleKey === "recovery_lite")?.planReasonLabels).toEqual(["athleteiq.liteGateway.planReason.recovery_lite"]);
    expect(summary.summaries.find((item) => item.moduleKey === "wearable_manual_sync")?.confidence).toBe("low");
    expect(summary.missingData).toContain("wearable_normalisation");
  });
});

describe("AthleteIQ lite module API validation", () => {
  it("returns structured validation errors before persistence", async () => {
    const response = await postManualWearable(new Request("http://localhost/api/athleteiq/wearables/manual-entry", {
      method: "POST",
      body: JSON.stringify({
        athleteId: "athlete-1",
        localDate: "2026-06-26",
        metricKey: "resting_heart_rate",
        value: 400,
        unit: "bpm",
        measuredAt: "2026-06-26T07:30:00.000Z"
      })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
    expect(payload.details).toContain("value is outside plausible resting_heart_rate bounds");
  });
});
