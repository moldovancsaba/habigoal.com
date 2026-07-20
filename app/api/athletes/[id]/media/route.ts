import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { listMediaByAthlete, listVisionAnalyses } from "@/repositories/media-asset.repository";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete", "performance_coach", "parent"]);
  if (authError) return authError;

  const { id: athleteId } = await params;
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (user && !(await canAccessAthlete(user, athleteId))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const [media, analyses] = await Promise.all([
    listMediaByAthlete(athleteId),
    listVisionAnalyses(athleteId),
  ]);

  return NextResponse.json({ media, analyses, realPipeline: env.capabilities.visionRealPipeline });
}
