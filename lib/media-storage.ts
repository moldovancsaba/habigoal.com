import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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

// Best-effort deletion of an athlete's stored media objects, used by GDPR erase.
// Gracefully no-ops when object storage is not configured (local/dev). Returns the
// number of objects it attempted to remove. Never throws — erase must complete even
// if a storage backend is briefly unavailable (the DB rows are still removed).
export async function deleteAthleteMediaObjects(athleteId: string, storageKeys: string[]): Promise<number> {
  let attempted = 0;
  const provider = process.env.MEDIA_STORAGE_PROVIDER;
  const bucket = process.env.MEDIA_STORAGE_BUCKET;
  const endpoint = process.env.MEDIA_STORAGE_ENDPOINT;
  const accessKey = process.env.MEDIA_STORAGE_ACCESS_KEY;
  const secretKey = process.env.MEDIA_STORAGE_SECRET_KEY;
  const region = process.env.MEDIA_STORAGE_REGION || "auto";

  const objectKeys = storageKeys.filter((key) => key && !key.startsWith("uploads/media/"));

  if ((provider === "s3" || provider === "r2") && bucket && endpoint && accessKey && secretKey && objectKeys.length > 0) {
    try {
      const client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: provider === "r2"
      });
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objectKeys.map((Key) => ({ Key })) }
        })
      );
      attempted += objectKeys.length;
    } catch (error) {
      console.warn("deleteAthleteMediaObjects: object-storage deletion failed", (error as Error).message);
    }
  }

  // Local fallback: remove the athlete's media directory if present.
  try {
    await rm(path.join(process.cwd(), "uploads", "media", athleteId), { recursive: true, force: true });
  } catch {
    // directory may not exist; ignore
  }

  return attempted;
}
