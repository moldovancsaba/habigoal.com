import { describe, expect, it } from "vitest";
import { POST as generateReport } from "@/app/api/athleteiq/reports/daily/generate/route";
import { buildDailyReportSnapshot, validateDailyReportRequest } from "@/lib/athleteiq-daily-report";
import { ATHLETEIQ_MODULE_REGISTRY_VERSION } from "@/lib/athleteiq-modules";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";

describe("AthleteIQ active-module daily report contract", () => {
  it("includes active report sections and labels lite/future boundaries", () => {
    const report = buildDailyReportSnapshot({
      reportType: "athlete",
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      dailyIq: dailyIq("high")
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(report.moduleRegistryVersion).toBe(ATHLETEIQ_MODULE_REGISTRY_VERSION);
    expect(report.sections.some((section) => section.maturity === "active")).toBe(true);
    expect(report.sections.some((section) => section.maturity === "lite_manual")).toBe(true);
    expect(report.sections.some((section) => section.maturity === "future")).toBe(false);
    expect(report.roadmapAppendix.some((section) => section.maturity === "future")).toBe(true);
    expect(report.algorithmVersions.dailyIq).toBe("daily-iq-test");
  });

  it("suppresses prescriptive recommendations when confidence is low", () => {
    const report = buildDailyReportSnapshot({
      reportType: "athlete",
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      dailyIq: dailyIq("low")
    });
    const readiness = report.sections.find((section) => section.key === "readiness");

    expect(readiness?.recommendations).toEqual(["athleteiq.reports.recommendations.reviewMissingData"]);
  });

  it("validates report target contracts", () => {
    expect(validateDailyReportRequest({ reportType: "team", localDate: "2026-06-26" })).toContain("teamId is required for coach and team reports");
    expect(validateDailyReportRequest({ reportType: "athlete", athleteId: "athlete-1", localDate: "2026-06-26" })).toEqual([]);
  });
});

describe("AthleteIQ daily report API validation", () => {
  it("validates body before report generation", async () => {
    const response = await generateReport(new Request("http://localhost/api/athleteiq/reports/daily/generate", {
      method: "POST",
      body: JSON.stringify({ reportType: "parent", localDate: "bad" })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function dailyIq(confidence: DailyIqSnapshot["confidence"]): DailyIqSnapshot {
  return {
    calculationId: "calc-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    mode: "performance",
    dailyIqScore: 72,
    readinessScore: 72,
    mentalEdgeScore: 70,
    habitScore: null,
    safeLoadScore: null,
    painRiskLevel: "low",
    confidence,
    dataUsed: ["checkIn"],
    missingData: [],
    explanation: [],
    algorithmVersion: "daily-iq-test",
    moduleRegistryVersion: "registry-test",
    componentWeights: { readiness: 0.4, mentalEdge: 0.3, habit: 0.2, safeLoad: 0.1 },
    painCapApplied: null,
    highIntensityBlocked: false,
    createdAt: "2026-06-26T12:00:00.000Z"
  };
}
