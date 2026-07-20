import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { jsonError, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser } from "@/lib/access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string; filename: string }> }
) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete", "performance_coach"]);
  if (authError) return authError;

  const { athleteId, filename } = await params;
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
  if (!(await canAccessAthlete(user, athleteId))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), "uploads", "media", athleteId, safeName);
  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const mime = ext === ".mp4" ? "video/mp4" : ext === ".png" ? "image/png" : "image/jpeg";
    return new NextResponse(buffer, { headers: { "Content-Type": mime } });
  } catch {
    return jsonError("File not found", 404, "NOT_FOUND");
  }
}
