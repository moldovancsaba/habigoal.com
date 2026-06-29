import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/config/env";
import { upsertTwin, findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { saveVisionAnalysis, updateMediaAssetStatus } from "@/repositories/media-asset.repository";
import { updateTechnicalFromVision, createEmptyTwin } from "@/lib/twin-updater";
import { extractFrameTimestamps, estimateDurationFromFileSize } from "@/lib/vision/frame-extraction";
import { VisionAiService } from "./vision-ai.service";

vi.mock("@/config/env", () => ({ env: { capabilities: { visionRealPipeline: false } } }));
vi.mock("@/lib/events/event-bus", () => ({ globalEventBus: { subscribe: vi.fn(), publish: vi.fn() } }));
vi.mock("@/repositories/queue.repository", () => ({ enqueueJob: vi.fn() }));
vi.mock("@/repositories/athlete-twin.repository", () => ({ findTwinByAthleteId: vi.fn(), upsertTwin: vi.fn() }));
vi.mock("@/repositories/media-asset.repository", () => ({ saveVisionAnalysis: vi.fn(), updateMediaAssetStatus: vi.fn() }));
vi.mock("@/lib/twin-updater", () => ({ updateTechnicalFromVision: vi.fn(() => ({})), createEmptyTwin: vi.fn(() => ({ athleteId: "a1", technical: {} })) }));
vi.mock("@/lib/vision/frame-extraction", () => ({
  extractFrameTimestamps: vi.fn(() => [0, 1, 2, 3, 4, 5]),
  estimateDurationFromFileSize: vi.fn(() => 6000)
}));

const service = new VisionAiService();
const payload = { mediaId: "m1", athleteId: "a1", fileSize: 100000, mimeType: "video/mp4" } as Parameters<typeof service.runTrackingPipeline>[0];

describe("vision honest gating (#188-194)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.capabilities.visionRealPipeline = false;
  });

  it("does NOT write fabricated metrics to the twin while the real pipeline is off", async () => {
    const result = await service.runTrackingPipeline(payload);

    // No twin mutation — the athlete profile is never polluted with heuristic vision data.
    expect(findTwinByAthleteId).not.toHaveBeenCalled();
    expect(updateTechnicalFromVision).not.toHaveBeenCalled();
    expect(upsertTwin).not.toHaveBeenCalled();

    // The result is honestly marked as not validated.
    expect(result.qualityAccepted).toBe(false);
    expect(result.confidence).toBe("low");
    expect(result.jointsCount).toBe(0);
    expect(result.limitations.join(" ")).toMatch(/not yet available/i);

    // Persisted state reflects "pending", not a fake "analysed" result.
    expect(saveVisionAnalysis).toHaveBeenCalledWith(expect.objectContaining({ qualityAccepted: false }));
    expect(updateMediaAssetStatus).toHaveBeenCalledWith("m1", expect.objectContaining({ status: "uploaded" }));
  });

  it("writes vision-derived technical metrics to the twin only when the real pipeline is enabled", async () => {
    env.capabilities.visionRealPipeline = true;

    await service.runTrackingPipeline(payload);

    // With ≥10 joints (6 frames + 5) and low anomaly (large file), quality is accepted
    // and the twin is updated from the (now real) pipeline.
    expect(updateTechnicalFromVision).toHaveBeenCalled();
    expect(upsertTwin).toHaveBeenCalled();
  });
});
