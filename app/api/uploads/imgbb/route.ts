import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { jsonError, requireRole } from "@/lib/api";

const maxSize = 32 * 1024 * 1024;

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "conductor"]);
  if (authError) return authError;

  const apiKey = env.imgbbApiKey;
  if (!apiKey) {
    return jsonError("IMGBB_API_KEY is not configured");
  }

  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("image");
  if (!(file instanceof File)) {
    return jsonError("Upload requires an image file field named image", 400, "VALIDATION_ERROR");
  }

  if (!file.type.startsWith("image/")) {
    return jsonError("Only image uploads are allowed", 400, "VALIDATION_ERROR");
  }

  if (file.size > maxSize) {
    return jsonError("Image exceeds ImgBB 32 MB limit", 400, "VALIDATION_ERROR");
  }

  const upload = new FormData();
  upload.set("image", file);
  upload.set("name", file.name.replace(/\.[^.]+$/, "").slice(0, 80));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body: upload
  });
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    error?: { message?: string };
    data?: {
      id?: string;
      title?: string;
      url?: string;
      display_url?: string;
      delete_url?: string;
      thumb?: { url?: string };
      image?: { url?: string };
    };
  } | null;

  if (!response.ok || !body?.success || !body.data?.url) {
    return jsonError(body?.error?.message || "ImgBB upload failed", response.ok ? 502 : response.status, "UPLOAD_FAILED");
  }

  return NextResponse.json({
    attachment: {
      id: body.data.id || crypto.randomUUID(),
      name: body.data.title || file.name,
      url: body.data.url,
      thumbUrl: body.data.thumb?.url || body.data.image?.url || body.data.display_url,
      deleteUrl: body.data.delete_url,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }
  });
}
