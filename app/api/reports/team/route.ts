import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser, resolveAccessibleAthleteIds } from "@/lib/access";
import { listChildrenWithMetrics } from "@/repositories/child.repository";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { reportingService } from "@/services/reporting.service";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach", "analyst", "club_management"]);
  if (authError) return authError;

  const teamId = new URL(request.url).searchParams.get("teamId");
  const authUser = await getAuthUser();
  const allowedIds = authUser ? await resolveAccessibleAthleteIds(authUser) : null;

  let athleteIds = (await listChildrenWithMetrics())
    .filter((a) => a._id)
    .filter((a) => !teamId || a.teamId === teamId)
    .map((a) => a._id!);

  if (allowedIds !== null) {
    athleteIds = athleteIds.filter((id) => allowedIds.includes(id));
  }

  const twins = await Promise.all(
    athleteIds.map(async (id) => (ObjectId.isValid(id) ? findTwinByAthleteId(id) : null))
  );

  const validPairs = athleteIds
    .map((id, index) => ({ id, twin: twins[index] }))
    .filter((entry): entry is { id: string; twin: NonNullable<typeof entry.twin> } => Boolean(entry.twin));

  const report = await reportingService.generateTeamReport(
    validPairs.map((p) => p.id),
    validPairs.map((p) => p.twin)
  );

  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;

  const body = (await readJson(request)) as { athleteIds?: string[] } | null;
  const requestedIds = Array.isArray(body?.athleteIds) ? body.athleteIds.filter((id) => typeof id === "string") : [];
  if (requestedIds.length === 0) {
    return jsonError("athleteIds required", 400, "VALIDATION_ERROR");
  }

  // RPT-004 (GH-199): scope the caller-supplied athleteIds to those the user may
  // access. The GET path already filters by accessibility; the POST must too, so
  // a coach cannot pull a team report over athletes outside their scope.
  const authUser = await getAuthUser();
  const allowedIds = authUser ? await resolveAccessibleAthleteIds(authUser) : null;
  const athleteIds = allowedIds === null ? requestedIds : requestedIds.filter((id) => allowedIds.includes(id));
  if (athleteIds.length === 0) {
    return jsonError("No accessible athletes in request", 403, "FORBIDDEN");
  }

  const twins = await Promise.all(athleteIds.map((id) => findTwinByAthleteId(id)));
  const validPairs = athleteIds
    .map((id, index) => ({ id, twin: twins[index] }))
    .filter((entry): entry is { id: string; twin: NonNullable<typeof entry.twin> } => Boolean(entry.twin));

  const report = await reportingService.generateTeamReport(
    validPairs.map((p) => p.id),
    validPairs.map((p) => p.twin)
  );

  return NextResponse.json(report);
}
