import { NextResponse } from "next/server";
import { env } from "@/config/env";

const maxSize = 32 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = env.imgbbApiKey;
  if (!apiKey) {
    return NextResponse.json({ error: "IMGBB_API_KEY is not configured" }, { status: 500 });
  }

  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload requires an image file field named image" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }

  if (file.size > maxSize) {
    return NextResponse.json({ error: "Image exceeds ImgBB 32 MB limit" }, { status: 400 });
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
    return NextResponse.json({
      error: body?.error?.message || "ImgBB upload failed"
    }, { status: response.ok ? 502 : response.status });
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
