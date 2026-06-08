import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface StoredMedia {
  storageKey: string;
  storageProvider: "local" | "s3" | "r2" | "imgbb";
  url: string;
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("video")) return ".mp4";
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  return ".jpg";
}

async function uploadToObjectStorage(
  provider: "s3" | "r2",
  athleteId: string,
  mediaId: string,
  buffer: Buffer,
  mimeType: string
): Promise<StoredMedia | null> {
  const endpoint = process.env.MEDIA_STORAGE_ENDPOINT;
  const bucket = process.env.MEDIA_STORAGE_BUCKET;
  const accessKey = process.env.MEDIA_STORAGE_ACCESS_KEY;
  const secretKey = process.env.MEDIA_STORAGE_SECRET_KEY;
  const region = process.env.MEDIA_STORAGE_REGION || "auto";
  const publicBase = process.env.MEDIA_STORAGE_PUBLIC_URL;

  if (!endpoint || !bucket || !accessKey || !secretKey) return null;

  const ext = extensionForMime(mimeType);
  const key = `athletes/${athleteId}/${mediaId}${ext}`;

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: provider === "r2",
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
    })
  );

  const url = publicBase
    ? `${publicBase.replace(/\/$/, "")}/${key}`
    : `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;

  return { storageKey: key, storageProvider: provider, url };
}

export async function storeMediaBuffer(
  athleteId: string,
  mediaId: string,
  buffer: Buffer,
  mimeType: string
): Promise<StoredMedia> {
  const provider = process.env.MEDIA_STORAGE_PROVIDER as StoredMedia["storageProvider"] | undefined;

  if (provider === "s3" || provider === "r2") {
    const stored = await uploadToObjectStorage(provider, athleteId, mediaId, buffer, mimeType);
    if (stored) return stored;
  }

  const uploadDir = path.join(process.cwd(), "uploads", "media", athleteId);
  await mkdir(uploadDir, { recursive: true });
  const filename = `${mediaId}${extensionForMime(mimeType)}`;
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);
  return {
    storageKey: `uploads/media/${athleteId}/${filename}`,
    storageProvider: "local",
    url: `/api/media/files/${athleteId}/${filename}`,
  };
}
