import { globalEventBus, DomainEvent } from "../lib/events/event-bus";
import { MediaUploadPayload } from "./media-processing.service";

export interface SkeletonTrackingResult {
  mediaId: string;
  athleteId: string;
  jointsCount: number;
  anomalyScore: number;
}

export class VisionAiService {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    globalEventBus.subscribe("MEDIA_UPLOADED", async (event: DomainEvent) => {
      const payload = event.payload as MediaUploadPayload;
      console.log(`Vision AI extracting skeleton for media ${payload.mediaId}`);
      await this.runTrackingPipeline(payload);
    });
  }

  async runTrackingPipeline(media: MediaUploadPayload): Promise<SkeletonTrackingResult> {
    const result: SkeletonTrackingResult = {
      mediaId: media.mediaId,
      athleteId: media.athleteId,
      jointsCount: 17,
      anomalyScore: 0.05,
    };

    await globalEventBus.publish({
      type: "SKELETON_TRACKED",
      payload: result,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}

export const visionAiService = new VisionAiService();
