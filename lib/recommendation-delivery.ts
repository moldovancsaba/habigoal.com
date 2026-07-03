import type { RecommendationResult } from "@/types/ai-engine";

// AI safety gating (GH-441). A recommendation flagged for human review (high-risk
// state, or any minor — see recommendation.engine) must NOT reach an end user
// (athlete/parent) until a coach approves it. Coaches/admins see it so they can
// review. Every surface that shows a recommendation to a user routes it through
// `gateRecommendationForAudience` instead of reading `.text` directly.

export type RecommendationAudience = "athlete" | "parent" | "coach" | "admin";

const REVIEWER_AUDIENCES: ReadonlySet<RecommendationAudience> = new Set(["coach", "admin"]);

export type GatedRecommendation = {
  /** Safe to display to this audience. */
  text: string;
  reason: string;
  confidence: RecommendationResult["confidence"];
  advisoryDisclaimer: string;
  /** True when withheld from this audience pending coach review. */
  withheld: boolean;
  awaitingReview: boolean;
};

/**
 * Returns the audience-safe view of a recommendation. End-user audiences get a
 * withheld placeholder (and the advisory disclaimer) while review is pending;
 * reviewer audiences always get the full text. The advisory disclaimer is always
 * present so guidance is never shown unlabelled.
 */
export function gateRecommendationForAudience(
  rec: RecommendationResult,
  audience: RecommendationAudience
): GatedRecommendation {
  const awaitingReview = rec.delivery === "awaiting_review";
  const isReviewer = REVIEWER_AUDIENCES.has(audience);
  const withheld = awaitingReview && !isReviewer;

  return {
    text: withheld ? "" : rec.text,
    reason: withheld ? "" : rec.reason,
    confidence: rec.confidence,
    advisoryDisclaimer: rec.advisoryDisclaimer,
    withheld,
    awaitingReview,
  };
}

export function isReviewerAudience(audience: RecommendationAudience): boolean {
  return REVIEWER_AUDIENCES.has(audience);
}
