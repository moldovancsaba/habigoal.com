import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/api";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { storeMediaBuffer } from "@/lib/media-storage";
import { upsertMediaAsset } from "@/repositories/media-asset.repository";
import { mediaProcessingService } from "@/services/media-processing.service";
import { extractFrameTimestamps, estimateDurationFromFileSize } from "@/lib/vision/frame-extraction";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete", "performance_coach"]);
  if (authError) return authError;

  const { id: athleteId } = await params;
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
  if (!(await canAccessAthlete(user, athleteId))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("file required", 400, "VALIDATION_ERROR");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaId = crypto.randomUUID();
  const stored = await storeMediaBuffer(athleteId, mediaId, buffer, file.type || "application/octet-stream");
  const durationMs = estimateDurationFromFileSize(buffer.length, file.type);
  const frameTimestampsMs = file.type.startsWith("video/") ? extractFrameTimestamps(durationMs) : undefined;

  const now = new Date().toISOString();
  await upsertMediaAsset({
    mediaId,
    athleteId,
    organisationId: "default",
    storageKey: stored.storageKey,
    storageProvider: stored.storageProvider,
    url: stored.url,
    mimeType: file.type,
    fileSize: buffer.length,
    status: "uploaded",
    frameCount: frameTimestampsMs?.length,
    uploadedBy: user.email,
    createdAt: now,
    updatedAt: now,
  });

  await mediaProcessingService.ingestMedia({
    mediaId,
    athleteId,
    url: stored.url,
    mimeType: file.type,
    fileSize: buffer.length,
    frameTimestampsMs,
    durationMs,
  });

  await logAuditEvent({
    actorEmail: user.email,
    actorRole: user.primaryRole,
    action: "athlete.update",
    resourceType: "media",
    resourceId: mediaId,
    metadata: { athleteId, frameCount: frameTimestampsMs?.length },
  });

  return NextResponse.json({ mediaId, url: stored.url, frameTimestampsMs });
}
