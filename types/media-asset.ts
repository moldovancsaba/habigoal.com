export type MediaAssetStatus = "uploaded" | "processing" | "analysed" | "rejected";

export interface MediaAsset {
  _id?: string;
  mediaId: string;
  athleteId: string;
  organisationId: string;
  storageKey: string;
  storageProvider: "local" | "s3" | "r2" | "imgbb";
  url: string;
  mimeType: string;
  fileSize: number;
  status: MediaAssetStatus;
  frameCount?: number;
  confidence?: "high" | "medium" | "low";
  limitations?: string[];
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisionAnalysisRecord {
  mediaId: string;
  athleteId: string;
  jointsCount: number;
  anomalyScore: number;
  confidence: "high" | "medium" | "low";
  limitations: string[];
  qualityAccepted: boolean;
  frameTimestampsMs?: number[];
  createdAt: string;
}
