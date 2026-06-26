import { describe, expect, it } from "vitest";
import { GET as getTimeline } from "@/app/api/athleteiq/gameflow/matches/[id]/timeline/route";
import { buildGameFlowFutureTimeline, validateGameFlowFutureBoundary, validateGameFlowTimelineRequest } from "@/lib/athleteiq-gameflow";

describe("AthleteIQ GameFlow future boundary", () => {
  it("returns roadmap metadata without production match metrics", () => {
    const timeline = buildGameFlowFutureTimeline({ matchId: "match-1", now: new Date("2026-06-26T12:00:00.000Z") });

    expect(timeline.enabled).toBe(false);
    expect(timeline.moduleMaturity).toBe("future");
    expect(timeline.segments).toEqual([]);
    expect(timeline.qualityMetrics.activeFootballPercentage).toBeNull();
    expect(timeline.dataUsed).toEqual([]);
    expect(timeline.missingData).toEqual(["video_rights", "event_source", "model_validation", "reviewer_workflow", "legal_approval"]);
    expect(validateGameFlowFutureBoundary(timeline)).toEqual([]);
  });

  it("validates match id before returning a disabled timeline", () => {
    expect(validateGameFlowTimelineRequest({ matchId: "" })).toContain("matchId is required");
    expect(validateGameFlowTimelineRequest({ matchId: "match-1" })).toEqual([]);
  });
});

describe("AthleteIQ GameFlow API", () => {
  it("returns the disabled future timeline contract", async () => {
    const response = await getTimeline(new Request("http://localhost/api/athleteiq/gameflow/matches/match-1/timeline"), {
      params: Promise.resolve({ id: "match-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.timeline.enabled).toBe(false);
    expect(payload.timeline.status).toBe("disabled_roadmap_only");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});
