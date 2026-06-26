import { describe, expect, it } from "vitest";
import { GET as getCognitiveResults } from "@/app/api/athleteiq/cognitive-lite/results/route";
import { GET as getCogLeagueTournaments } from "@/app/api/athleteiq/cogleague/tournaments/route";
import { buildCognitiveLiteJourney, buildCogLeagueBoundary, buildCogLeagueCheckpointContract, validateCogLeagueBoundary } from "@/lib/athleteiq-cognitive";
import type { ChildProfile } from "@/repositories/child.repository";

describe("AthleteIQ Cognitive Lite boundary", () => {
  it("renders local non-benchmark trait results from profile baselines", () => {
    const journey = buildCognitiveLiteJourney({ athleteId: "athlete-1", athlete: athleteProfile(), now: new Date("2026-06-26T12:00:00.000Z") });

    expect(journey.moduleMaturity).toBe("lite_manual");
    expect(journey.benchmarkStatus).toBe("non_benchmark");
    expect(journey.traitResults).toHaveLength(6);
    expect(journey.traitResults.every((result) => result.score === null || (result.score >= 0 && result.score <= 100))).toBe(true);
    expect(journey.traitResults.every((result) => result.source === "local_profile")).toBe(true);
    expect(journey.dataUsed).toContain("profile_baseline:reasoning");
  });

  it("keeps partial cognitive journeys explicit", () => {
    const journey = buildCognitiveLiteJourney({ athleteId: "athlete-1", athlete: { ...athleteProfile(), baselineProfile: { focusBaseline: 70 } } });

    expect(journey.isComplete).toBe(false);
    expect(journey.completedTraitCount).toBeLessThan(journey.totalTraitCount);
    expect(journey.missingData).toContain("profile_baseline:reasoning");
  });

  it("keeps CogLeague disabled until partner and consent gates exist", () => {
    const boundary = buildCogLeagueBoundary(new Date("2026-06-26T12:00:00.000Z"));

    expect(boundary.enabled).toBe(false);
    expect(boundary.tournaments[0].status).toBe("disabled_partner_future");
    expect(boundary.tournaments[0].rewardsVisible).toBe(false);
    expect(boundary.tournaments[0].revenueClaimsVisible).toBe(false);
    expect(validateCogLeagueBoundary(boundary)).toEqual([]);
  });

  it("locks checkpoint attempts beyond the documented limit", () => {
    const checkpoint = buildCogLeagueCheckpointContract({
      athleteId: "athlete-1",
      tournamentId: "cogleague:2026-q2:future-template",
      attemptNumber: 4,
      traitResults: []
    });

    expect(checkpoint.status).toBe("locked_attempt_limit");
    expect(checkpoint.lockReason).toBe("attempt_limit_exceeded");
    expect(checkpoint.missingData).toContain("ranking_tie_breakers");
  });
});

describe("AthleteIQ Cognitive APIs", () => {
  it("returns structured validation errors for missing athlete id", async () => {
    const response = await getCognitiveResults(new Request("http://localhost/api/athleteiq/cognitive-lite/results"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("returns the disabled CogLeague future boundary", async () => {
    const response = await getCogLeagueTournaments();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.boundary.enabled).toBe(false);
    expect(payload.boundary.tournaments[0].rankingStatus).toBe("disabled_until_partner_contract");
  });
});

function athleteProfile(): ChildProfile {
  return {
    _id: "athlete-1",
    name: "Example Athlete",
    birthDate: "2009-04-20",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
    baselineProfile: {
      cognitiveScore: 152,
      focusBaseline: 72,
      confidenceBaseline: 68,
      motivationBaseline: 80,
      stressBaseline: 40
    }
  };
}
