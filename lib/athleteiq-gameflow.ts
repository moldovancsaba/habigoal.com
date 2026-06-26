import { getAthleteIqModule } from "@/lib/athleteiq-modules";
import type { GameFlowMatchTimeline, GameFlowRoadmapRequirement } from "@/types/athleteiq-gameflow";

export const ATHLETEIQ_GAMEFLOW_CAPABILITY_KEY = "AIQ-1340";
export const ATHLETEIQ_GAMEFLOW_VERSION = "aiq-gameflow-boundary-1340.1";

const roadmapRequirements: GameFlowRoadmapRequirement[] = ["video_rights", "event_source", "model_validation", "reviewer_workflow", "legal_approval"];

export function validateGameFlowTimelineRequest(input: { matchId?: string }) {
  const errors: string[] = [];
  if (!input.matchId?.trim()) errors.push("matchId is required");
  return errors;
}

export function buildGameFlowFutureTimeline(input: { matchId: string; now?: Date }): GameFlowMatchTimeline {
  const moduleDefinition = getAthleteIqModule("gameflow_future");
  if (!moduleDefinition || moduleDefinition.maturity !== "future") throw new Error("gameflow_future must remain future-only");

  return {
    matchId: input.matchId,
    source: "future_video_or_event_feed",
    enabled: false,
    moduleKey: "gameflow_future",
    moduleMaturity: "future",
    claimBoundary: "partner_future",
    status: "disabled_roadmap_only",
    segments: [],
    qualityMetrics: {
      activeFootballPercentage: null,
      deadTimeRatio: null,
      frictionCount: null,
      delayConfidence: null,
      modelErrorBounds: null
    },
    attribution: {
      teamContext: "not_available",
      refereeContext: "not_available",
      leagueContext: "not_available",
      broadcasterContext: "not_available"
    },
    modelVersion: "not_reviewed",
    requirements: roadmapRequirements,
    dataUsed: [],
    missingData: roadmapRequirements,
    generatedAt: (input.now ?? new Date()).toISOString(),
    capabilityKey: ATHLETEIQ_GAMEFLOW_CAPABILITY_KEY,
    version: ATHLETEIQ_GAMEFLOW_VERSION
  };
}

export function validateGameFlowFutureBoundary(timeline: GameFlowMatchTimeline) {
  const errors: string[] = [];
  if (timeline.enabled) errors.push("GameFlow must remain disabled while module maturity is future");
  if (timeline.segments.length) errors.push("Future GameFlow timeline cannot expose production segments");
  if (timeline.dataUsed.length) errors.push("Future GameFlow timeline cannot report live data");
  if (timeline.modelVersion !== "not_reviewed") errors.push("GameFlow model output must stay unavailable until reviewed");
  if (!timeline.missingData.includes("video_rights")) errors.push("video rights must block processing");
  return errors;
}
