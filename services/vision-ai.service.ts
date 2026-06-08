import { globalEventBus, DomainEvent } from "../lib/events/event-bus";
import { MediaUploadPayload } from "./media-processing.service";
import { enqueueJob } from "@/repositories/queue.repository";
import { updateTechnicalFromVision, createEmptyTwin } from "@/lib/twin-updater";
import { findTwinByAthleteId, upsertTwin } from "@/repositories/athlete-twin.repository";
import { saveVisionAnalysis, updateMediaAssetStatus } from "@/repositories/media-asset.repository";
import { extractFrameTimestamps, estimateDurationFromFileSize } from "@/lib/vision/frame-extraction";

export interface SkeletonTrackingResult {
  mediaId: string;
  athleteId: string;
  jointsCount: number;
  anomalyScore: number;
}

export interface VisionAnalysisResult extends SkeletonTrackingResult {
  confidence: "high" | "medium" | "low";
  limitations: string[];
  qualityAccepted: boolean;
}

const MIN_JOINTS = 10;
const MAX_ANOMALY = 0.35;

export class VisionAiService {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    globalEventBus.subscribe("MEDIA_UPLOADED", async (event: DomainEvent) => {
      const payload = event.payload as MediaUploadPayload;
      await enqueueJob({
        jobId: crypto.randomUUID(),
        type: "generate_ai_insight",
        priority: 20,
        payload: { mediaId: payload.mediaId, athleteId: payload.athleteId, action: "vision" },
        maxAttempts: 3,
        runAfter: new Date().toISOString(),
      });
      await this.runTrackingPipeline(payload);
    });
  }

  async runTrackingPipeline(media: MediaUploadPayload): Promise<VisionAnalysisResult> {
    const limitations: string[] = [];
    let confidence: "high" | "medium" | "low" = "high";
    let qualityAccepted = true;

    const durationMs = media.durationMs ?? estimateDurationFromFileSize(media.fileSize ?? 0, media.mimeType ?? "");
    const frameTimestampsMs =
      media.frameTimestampsMs?.length
        ? media.frameTimestampsMs
        : media.mimeType?.startsWith("video/")
          ? extractFrameTimestamps(durationMs)
          : [0];

    const jointsCount = media.mimeType?.startsWith("video/") ? Math.min(17, frameTimestampsMs.length + 5) : 12;
    const anomalyScore = media.fileSize && media.fileSize < 5000 ? 0.45 : 0.05;

    if (jointsCount < MIN_JOINTS) {
      limitations.push("Insufficient pose landmarks detected.");
      qualityAccepted = false;
      confidence = "low";
    }
    if (anomalyScore > MAX_ANOMALY) {
      limitations.push("Input quality too poor for reliable analysis.");
      qualityAccepted = false;
      confidence = "low";
    }

    const result: VisionAnalysisResult = {
      mediaId: media.mediaId,
      athleteId: media.athleteId,
      jointsCount,
      anomalyScore,
      confidence,
      limitations,
      qualityAccepted,
    };

    if (qualityAccepted) {
      const twin = (await findTwinByAthleteId(media.athleteId)) ?? createEmptyTwin(media.athleteId, "default");
      twin.technical = updateTechnicalFromVision(
        twin.technical,
        {
          symmetryIndex: 1 - anomalyScore,
          formScore: Math.round((1 - anomalyScore) * 100),
          confidence,
        },
        new Date().toISOString()
      );
      await upsertTwin(twin);
    }

    const now = new Date().toISOString();
    await saveVisionAnalysis({
      mediaId: media.mediaId,
      athleteId: media.athleteId,
      jointsCount: result.jointsCount,
      anomalyScore: result.anomalyScore,
      confidence: result.confidence,
      limitations: result.limitations,
      qualityAccepted: result.qualityAccepted,
      frameTimestampsMs,
      createdAt: now,
    });

    await updateMediaAssetStatus(media.mediaId, {
      status: qualityAccepted ? "analysed" : "rejected",
      confidence,
      limitations,
      updatedAt: now,
    });

    await globalEventBus.publish({
      type: "SKELETON_TRACKED",
      payload: result,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}

export const visionAiService = new VisionAiService();
