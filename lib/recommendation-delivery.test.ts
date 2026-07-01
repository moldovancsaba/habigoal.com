import { describe, expect, it } from "vitest";
import { gateRecommendationForAudience, isReviewerAudience } from "@/lib/recommendation-delivery";
import type { RecommendationResult } from "@/types/ai-engine";

const base: RecommendationResult = {
  text: "Proceed with the planned session.",
  textKey: "good",
  reason: "Readiness is good.",
  confidence: "high",
  humanReviewRequired: false,
  delivery: "direct",
  advisoryDisclaimer: "Coaching readiness indicator, not a medical diagnosis.",
  modelVersion: "1.0.0",
};
const awaiting: RecommendationResult = { ...base, humanReviewRequired: true, delivery: "awaiting_review" };

describe("gateRecommendationForAudience (#441)", () => {
  it("delivers a direct recommendation to every audience", () => {
    for (const a of ["athlete", "parent", "coach", "admin"] as const) {
      const g = gateRecommendationForAudience(base, a);
      expect(g.withheld).toBe(false);
      expect(g.text).toBe(base.text);
    }
  });

  it("withholds an awaiting-review recommendation from athlete and parent", () => {
    for (const a of ["athlete", "parent"] as const) {
      const g = gateRecommendationForAudience(awaiting, a);
      expect(g.withheld).toBe(true);
      expect(g.awaitingReview).toBe(true);
      expect(g.text).toBe("");
      expect(g.reason).toBe("");
    }
  });

  it("still shows an awaiting-review recommendation to coach and admin reviewers", () => {
    for (const a of ["coach", "admin"] as const) {
      const g = gateRecommendationForAudience(awaiting, a);
      expect(g.withheld).toBe(false);
      expect(g.text).toBe(awaiting.text);
    }
  });

  it("always carries the advisory disclaimer, even when withheld", () => {
    expect(gateRecommendationForAudience(awaiting, "athlete").advisoryDisclaimer).toBe(base.advisoryDisclaimer);
    expect(gateRecommendationForAudience(base, "athlete").advisoryDisclaimer).toBe(base.advisoryDisclaimer);
  });

  it("classifies reviewer audiences", () => {
    expect(isReviewerAudience("coach")).toBe(true);
    expect(isReviewerAudience("admin")).toBe(true);
    expect(isReviewerAudience("athlete")).toBe(false);
    expect(isReviewerAudience("parent")).toBe(false);
  });
});
