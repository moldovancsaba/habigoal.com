/**
 * Extracts frame timestamps for video analysis (VIS-004).
 * Production replaces with ffmpeg/ONNX pipeline on local AI cluster.
 */
export function extractFrameTimestamps(durationMs: number, maxFrames = 12): number[] {
  if (durationMs <= 0) return [0];
  const step = Math.max(Math.floor(durationMs / maxFrames), 250);
  const frames: number[] = [];
  for (let t = 0; t < durationMs && frames.length < maxFrames; t += step) {
    frames.push(t);
  }
  return frames;
}

export function estimateDurationFromFileSize(fileSize: number, mimeType: string): number {
  if (!mimeType.startsWith("video/")) return 0;
  // Rough estimate: 1MB ≈ 1 second at moderate compression
  return Math.max(1000, Math.round((fileSize / 1_000_000) * 1000));
}
