import { globalEventBus } from "../lib/events/event-bus";

export interface MediaUploadPayload {
  mediaId: string;
  athleteId: string;
  url: string;
  mimeType: string;
  fileSize?: number;
  frameTimestampsMs?: number[];
  durationMs?: number;
}

export class MediaProcessingService {
  async ingestMedia(payload: MediaUploadPayload): Promise<void> {
    console.log(`Ingesting media: ${payload.mediaId}`);
    // Simulate processing
    await globalEventBus.publish({
      type: "MEDIA_UPLOADED",
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}

export const mediaProcessingService = new MediaProcessingService();
