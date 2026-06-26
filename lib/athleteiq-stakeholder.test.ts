import { describe, expect, it } from "vitest";
import { POST as postAlertAction } from "@/app/api/athleteiq/coach/alerts/[id]/actions/route";
import { GET as getCoachDashboard } from "@/app/api/athleteiq/coach/dashboard/route";
import {
  ATHLETEIQ_STAKEHOLDER_VERSION,
  TEAM_AGGREGATE_PRIVACY_THRESHOLD,
  buildCoachProjection,
  buildParentProjection,
  buildStakeholderAlerts,
  buildStakeholderAthleteCard,
  buildTeamProjection
} from "@/lib/athleteiq-stakeholder";
import type { StakeholderAthleteSource } from "@/lib/athleteiq-stakeholder";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";

describe("AthleteIQ stakeholder projection contract", () => {
  it("redacts parent risk fields while preserving supportive summary", () => {
    const source = athleteSource({ score: 82, painRiskLevel: "high" });
    const card = buildStakeholderAthleteCard(source, "parent");
    const projection = buildParentProjection({ source, localDate: "2026-06-26" });

    expect(ATHLETEIQ_STAKEHOLDER_VERSION).toBe("aiq-stakeholder-1300.1");
    expect(card.painRiskLevel).toBe("redacted");
    expect(card.mentalRiskLevel).toBe("redacted");
    expect(projection.redactions).toContain("painLocations");
    expect(projection.dailySummary).toContain("Daily status bucket");
  });

  it("builds coach action queue from pain, mental, readiness, and incomplete signals", () => {
    const projection = buildCoachProjection({
      teamId: "team-1",
      localDate: "2026-06-26",
      sources: [
        athleteSource({ score: 35 }),
        athleteSource({ athleteId: "athlete-2", score: null, confidence: "insufficient" })
      ]
    });

    expect(projection.alerts.map((alert) => alert.type)).toContain("readiness");
    expect(projection.alerts.map((alert) => alert.type)).toContain("incomplete");
    expect(projection.actionQueue.every((alert) => alert.severity !== "info")).toBe(true);
  });

  it("suppresses small-team readiness distribution", () => {
    const cards = [buildStakeholderAthleteCard(athleteSource({ score: 90 }), "team")];
    const projection = buildTeamProjection({ teamId: "team-1", localDate: "2026-06-26", cards, alerts: [] });

    expect(TEAM_AGGREGATE_PRIVACY_THRESHOLD).toBe(3);
    expect(projection.readinessDistribution.suppressed).toBe(true);
    expect(projection.readinessDistribution.green).toBe(0);
    expect(projection.redactions).toContain("readinessDistribution");
  });

  it("exposes sufficient team aggregates above privacy threshold", () => {
    const cards = [
      buildStakeholderAthleteCard(athleteSource({ athleteId: "a1", score: 80 }), "team"),
      buildStakeholderAthleteCard(athleteSource({ athleteId: "a2", score: 55 }), "team"),
      buildStakeholderAthleteCard(athleteSource({ athleteId: "a3", score: 25 }), "team")
    ];
    const projection = buildTeamProjection({ teamId: "team-1", localDate: "2026-06-26", cards, alerts: buildStakeholderAlerts(athleteSource({ athleteId: "a3", score: 25 })) });

    expect(projection.readinessDistribution).toMatchObject({ green: 1, yellow: 1, red: 1, incomplete: 0, suppressed: false });
    expect(projection.flagsCount).toBeGreaterThanOrEqual(1);
  });
});

describe("AthleteIQ stakeholder API validation", () => {
  it("validates team id before coach dashboard access", async () => {
    const response = await getCoachDashboard(new Request("http://localhost/api/athleteiq/coach/dashboard"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates alert action status before persistence", async () => {
    const response = await postAlertAction(new Request("http://localhost/api/athleteiq/coach/alerts/alert-1/actions", {
      method: "POST",
      body: JSON.stringify({ athleteId: "athlete-1", date: "2026-06-26", status: "bad" })
    }), { params: Promise.resolve({ id: "alert-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function athleteSource(input: {
  athleteId?: string;
  score: number | null;
  confidence?: DailyIqSnapshot["confidence"];
  painRiskLevel?: DailyIqSnapshot["painRiskLevel"];
}): StakeholderAthleteSource {
  const athleteId = input.athleteId ?? "athlete-1";
  return {
    athleteId,
    name: athleteId,
    dailyIq: input.score === null ? null : {
      calculationId: `calc-${athleteId}`,
      athleteId,
      localDate: "2026-06-26",
      timezone: "UTC",
      mode: "performance",
      dailyIqScore: input.score,
      readinessScore: input.score,
      mentalEdgeScore: input.score,
      habitScore: null,
      safeLoadScore: null,
      painRiskLevel: input.painRiskLevel ?? "none",
      confidence: input.confidence ?? "high",
      dataUsed: ["checkIn"],
      missingData: [],
      explanation: [],
      algorithmVersion: "test",
      moduleRegistryVersion: "test",
      componentWeights: { readiness: 0.4, mentalEdge: 0.3, habit: 0.2, safeLoad: 0.1 },
      painCapApplied: null,
      highIntensityBlocked: false,
      createdAt: "2026-06-26T12:00:00.000Z"
    },
    mentalEdge: null,
    painAlerts: [],
    dailyPlan: null,
    twinProjection: null
  };
}
