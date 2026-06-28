import { describe, expect, it } from "vitest";
import { GET as getCognitiveResults } from "@/app/api/athleteiq/cognitive-lite/results/route";
import { GET as getCogLeagueTournaments } from "@/app/api/athleteiq/cogleague/tournaments/route";
import { buildCognitiveLiteJourney, buildCogLeagueBoundary, buildCogLeagueCheckpointContract, validateCogLeagueBoundary, validateCognitiveTraitEntry } from "@/lib/athleteiq-cognitive";
import type { ChildProfile } from "@/repositories/child.repository";
import type { CognitiveTraitEntry } from "@/types/athleteiq-cognitive";

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

  it("treats an entered trait result as manual-entry-backed and authoritative", () => {
    const entries: CognitiveTraitEntry[] = [
      { athleteId: "athlete-1", trait: "attention", localDate: "2026-06-26", score: 88, source: "manual_entry", enteredAt: "2026-06-26T08:00:00.000Z" }
    ];
    const journey = buildCognitiveLiteJourney({ athleteId: "athlete-1", athlete: athleteProfile(), entries, now: new Date("2026-06-26T12:00:00.000Z") });

    const attention = journey.traitResults.find((result) => result.trait === "attention");
    expect(attention?.provenance).toBe("entered");
    expect(attention?.source).toBe("manual_entry");
    expect(attention?.score).toBe(88);
    expect(attention?.dataUsed).toContain("manual_entry:attention");
    expect(journey.enteredTraitCount).toBe(1);

    // Other traits remain derived from the baseline.
    const reasoning = journey.traitResults.find((result) => result.trait === "reasoning");
    expect(reasoning?.provenance).toBe("derived");
  });

  it("prefers the most recent entry per trait", () => {
    const entries: CognitiveTraitEntry[] = [
      { athleteId: "athlete-1", trait: "memory_retention", localDate: "2026-06-25", score: 40, source: "manual_entry", enteredAt: "2026-06-25T08:00:00.000Z" },
      { athleteId: "athlete-1", trait: "memory_retention", localDate: "2026-06-26", score: 90, source: "manual_entry", enteredAt: "2026-06-26T08:00:00.000Z" }
    ];
    const journey = buildCognitiveLiteJourney({ athleteId: "athlete-1", athlete: null, entries });
    const memory = journey.traitResults.find((result) => result.trait === "memory_retention");
    expect(memory?.score).toBe(90);
    expect(memory?.provenance).toBe("entered");
  });

  it("marks traits with neither entry nor baseline as missing (no fabricated score)", () => {
    const journey = buildCognitiveLiteJourney({ athleteId: "athlete-1", athlete: null, entries: [] });
    expect(journey.enteredTraitCount).toBe(0);
    expect(journey.completedTraitCount).toBe(0);
    expect(journey.traitResults.every((result) => result.provenance === "missing")).toBe(true);
    expect(journey.traitResults.every((result) => result.score === null)).toBe(true);
  });

  it("clamps an out-of-range entered score into the 0..100 band", () => {
    const entries: CognitiveTraitEntry[] = [
      { athleteId: "athlete-1", trait: "risk", localDate: "2026-06-26", score: 140, source: "manual_entry", enteredAt: "2026-06-26T08:00:00.000Z" }
    ];
    const journey = buildCognitiveLiteJourney({ athleteId: "athlete-1", athlete: null, entries });
    const risk = journey.traitResults.find((result) => result.trait === "risk");
    expect(risk?.score).toBe(100);
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

describe("validateCognitiveTraitEntry", () => {
  it("accepts a known trait and an in-range score", () => {
    expect(validateCognitiveTraitEntry({ trait: "attention", score: 75 })).toEqual([]);
    expect(validateCognitiveTraitEntry({ trait: "risk", score: 0 })).toEqual([]);
    expect(validateCognitiveTraitEntry({ trait: "risk", score: 100 })).toEqual([]);
  });

  it("rejects an unknown trait", () => {
    expect(validateCognitiveTraitEntry({ trait: "speed", score: 50 })).toContain("trait must be one of: alertness, impulse_control, attention, risk, reasoning, memory_retention");
  });

  it("rejects a non-numeric or out-of-range score", () => {
    expect(validateCognitiveTraitEntry({ trait: "attention", score: "high" }).some((error) => error.includes("score must be a number"))).toBe(true);
    expect(validateCognitiveTraitEntry({ trait: "attention", score: 101 }).some((error) => error.includes("between 0 and 100"))).toBe(true);
    expect(validateCognitiveTraitEntry({ trait: "attention", score: -1 }).some((error) => error.includes("between 0 and 100"))).toBe(true);
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
