import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { listMicrocycles, upsertMicrocycle } from "@/repositories/microcycles.repository";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;
  const teamId = new URL(request.url).searchParams.get("teamId") ?? undefined;
  return NextResponse.json({ microcycles: await listMicrocycles(teamId) });
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body?.teamId || !body?.startDate || !body?.endDate) {
    return jsonError("teamId, startDate, endDate required", 400, "VALIDATION_ERROR");
  }
  const cycle = await upsertMicrocycle({
    microcycleId: typeof body.microcycleId === "string" ? body.microcycleId : crypto.randomUUID(),
    teamId: String(body.teamId),
    startDate: String(body.startDate),
    endDate: String(body.endDate),
    goal: typeof body.goal === "string" ? body.goal : "",
    sessionIds: Array.isArray(body.sessionIds) ? body.sessionIds.filter((v): v is string => typeof v === "string") : [],
  });
  return NextResponse.json(cycle);
}
