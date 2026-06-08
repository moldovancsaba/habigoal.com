import { describe, it, expect } from "vitest";
import {
  buildMetricId,
  normaliseCheckinToMetrics,
  normaliseTrainingLoadToMetrics,
} from "../lib/normalise-metric";
import { AssessmentRecord } from "../types/assessment";
import { TrainingLoadRecord } from "../types/training-load";

describe("normalise-metric", () => {
  it("should build a deterministic metricId", () => {
    const id = buildMetricId("athlete1", "2023-10-01", "check_in", "sleep_quality_score");
    expect(id).toBe("athlete1:2023-10-01:check_in:sleep_quality_score");
  });

  describe("normaliseCheckinToMetrics", () => {
    it("should normalise scores correctly", () => {
      const checkin: AssessmentRecord = {
        mode: "rapid",
        child: {} as any,
        session: { date: "2023-10-01" } as any,
        trainingLoad: {} as any,
        scores: {
          mood: { score: 8, note: "", confidence: "high" },
          energy: { score: 7, note: "" },
          sleep: { score: 6, note: "", confidence: "low" },
        },
        notes: {} as any,
        attachments: [],
        computed: {} as any,
        createdAt: "2023-10-01",
        updatedAt: "2023-10-01",
      };

      const metrics = normaliseCheckinToMetrics("athlete1", "org1", checkin, "raw123");

      expect(metrics).toHaveLength(3);

      const mood = metrics.find((m) => m.canonicalKey === "mood_score");
      expect(mood?.value).toBe(8);
      expect(mood?.confidence).toBe("high");
      expect(mood?.rawPayloadId).toBe("raw123");

      const sleep = metrics.find((m) => m.canonicalKey === "sleep_quality_score");
      expect(sleep?.value).toBe(6);
      expect(sleep?.confidence).toBe("low");
    });
  });

  describe("normaliseTrainingLoadToMetrics", () => {
    it("should normalise training load correctly", () => {
      const record: TrainingLoadRecord = {
        athleteId: "athlete1",
        date: "2023-10-01",
        source: "trainer",
        activityTypes: ["football"],
        durationMinutes: 90,
        rpe: 8,
        loadPoints: 720,
        createdBy: "coach1",
        createdAt: "2023-10-01",
        updatedAt: "2023-10-01",
      };

      const metrics = normaliseTrainingLoadToMetrics(record, "org1", "raw456");

      expect(metrics).toHaveLength(3);

      const load = metrics.find((m) => m.canonicalKey === "internal_load_points");
      expect(load?.value).toBe(720);
      expect(load?.source).toBe("manual_coach");

      const rpe = metrics.find((m) => m.canonicalKey === "session_rpe");
      expect(rpe?.value).toBe(8);

      const duration = metrics.find((m) => m.canonicalKey === "session_duration_minutes");
      expect(duration?.value).toBe(90);
    });
  });
});
