export type GameFlowSegmentType = "active_football" | "preparation" | "dead_time" | "friction" | "delay";
export type GameFlowRoadmapRequirement = "video_rights" | "event_source" | "model_validation" | "reviewer_workflow" | "legal_approval";

export type GameFlowTimelineSegment = {
  id: string;
  type: GameFlowSegmentType;
  startMs: number;
  endMs: number;
  confidence: number | null;
  attribution: string[];
};

export type GameFlowQualityMetrics = {
  activeFootballPercentage: number | null;
  deadTimeRatio: number | null;
  frictionCount: number | null;
  delayConfidence: number | null;
  modelErrorBounds: string | null;
};

export type GameFlowMatchTimeline = {
  matchId: string;
  source: "future_video_or_event_feed";
  enabled: false;
  moduleKey: "gameflow_future";
  moduleMaturity: "future";
  claimBoundary: "partner_future";
  status: "disabled_roadmap_only";
  segments: GameFlowTimelineSegment[];
  qualityMetrics: GameFlowQualityMetrics;
  attribution: {
    teamContext: "not_available";
    refereeContext: "not_available";
    leagueContext: "not_available";
    broadcasterContext: "not_available";
  };
  modelVersion: "not_reviewed";
  requirements: GameFlowRoadmapRequirement[];
  dataUsed: string[];
  missingData: GameFlowRoadmapRequirement[];
  generatedAt: string;
  capabilityKey: string;
  version: string;
};
