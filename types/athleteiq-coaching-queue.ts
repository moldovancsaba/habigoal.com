import type { ConfidenceLevel } from "./ai-engine";

// A per-athlete coaching signal for the trainer daily loop (P0 GH-525). Combines
// the recommendation engine output with the injury-risk engine output so the
// coach sees "what to do" and "what to watch" in one queue. Raw recommendation
// text is coach/admin-only (delivery === "awaiting_review" withholds it from
// end-user surfaces per GH-441).
export interface CoachingQueueEntry {
  athleteId: string;
  readiness: {
    score: number;
    zone: "peak" | "good" | "moderate" | "fatigued" | "recovery";
    clearedForHighIntensity: boolean;
  };
  recommendation: {
    text: string;
    reason: string;
    confidence: ConfidenceLevel;
    humanReviewRequired: boolean;
    delivery: "direct" | "awaiting_review";
  };
  injuryRisk: {
    riskLevel: "low" | "elevated" | "high";
    flags: string[];
    loadReductionRecommended: boolean;
    confidence: ConfidenceLevel;
  };
  // Higher = more urgent; used for deterministic queue ordering.
  urgency: number;
  generatedAt: string;
}
