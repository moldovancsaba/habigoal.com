import { NextResponse } from "next/server";
import { canAccessAthleteIqAthlete, getAuthUser } from "@/lib/access";
import { jsonError, requireRole } from "@/lib/api";
import { findByAthleteAndDateRange } from "@/repositories/canonical-metric.repository";
import { latestMetricsByKey } from "@/lib/wearable-dashboard-view";

// GET /api/athletes/[id]/devices/recent-metrics — latest canonical metric per
// key over a bounded recent window, for the wearables dashboard summary. Thin,
// athlete-scoped read (the API-key-gated /api/v1/metrics is for external ingest,
// not the browser).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach", "physio", "athlete"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (!authUser || !(await canAccessAthleteIqAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get("days")) || 7, 1), 90);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const toDate = to.toISOString().slice(0, 10);
    const fromDate = from.toISOString().slice(0, 10);

    const metrics = await findByAthleteAndDateRange(id, fromDate, toDate);
    const latest = Array.from(latestMetricsByKey(metrics).values());

    return NextResponse.json({ metrics: latest, window: { from: fromDate, to: toDate } });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
