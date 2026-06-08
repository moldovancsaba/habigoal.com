import { getDatabase } from "@/lib/mongodb";
import type { MediaAsset, VisionAnalysisRecord } from "@/types/media-asset";

const MEDIA = "media_assets";
const ANALYSIS = "vision_analyses";

export async function upsertMediaAsset(asset: MediaAsset): Promise<void> {
  const db = await getDatabase();
  await db.collection(MEDIA).updateOne({ mediaId: asset.mediaId }, { $set: asset }, { upsert: true });
}

export async function listMediaByAthlete(athleteId: string): Promise<MediaAsset[]> {
  const db = await getDatabase();
  const rows = await db.collection(MEDIA).find({ athleteId }).sort({ createdAt: -1 }).limit(50).toArray();
  return rows as unknown as MediaAsset[];
}

export async function saveVisionAnalysis(record: VisionAnalysisRecord): Promise<void> {
  const db = await getDatabase();
  await db.collection(ANALYSIS).updateOne({ mediaId: record.mediaId }, { $set: record }, { upsert: true });
}

export async function listVisionAnalyses(athleteId: string): Promise<VisionAnalysisRecord[]> {
  const db = await getDatabase();
  const rows = await db.collection(ANALYSIS).find({ athleteId }).sort({ createdAt: -1 }).limit(20).toArray();
  return rows as unknown as VisionAnalysisRecord[];
}

export async function updateMediaAssetStatus(
  mediaId: string,
  update: Pick<MediaAsset, "status" | "confidence" | "limitations" | "updatedAt">
): Promise<void> {
  const db = await getDatabase();
  await db.collection(MEDIA).updateOne({ mediaId }, { $set: update });
}
