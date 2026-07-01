import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser } from "@/lib/access";
import { addAthleteToTeam, removeAthleteFromTeam, getTeamById } from "@/repositories/team.repository";

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

// Roster management (#526 P1): add/remove athletes from a team.
// PATCH body: { add?: string[], remove?: string[] }
export async function PATCH(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const { teamId } = await params;
    const team = await getTeamById(teamId);
    if (!team) return jsonError("Team not found", 404, "NOT_FOUND");

    const authUser = await getAuthUser();
    const email = authUser?.email?.toLowerCase().trim();
    const canManage = authUser?.primaryRole === "admin" || (email ? team.trainerEmails.includes(email) : false);
    if (!canManage) return jsonError("Forbidden", 403, "FORBIDDEN");

    const body = (await readJson(request)) as Record<string, unknown> | null;
    const add = stringArray(body?.add);
    const remove = stringArray(body?.remove);
    if (add.length === 0 && remove.length === 0) {
      return jsonError("Provide at least one athlete to add or remove", 400, "INVALID_PAYLOAD");
    }

    let updated = team;
    for (const athleteId of add) {
      const next = await addAthleteToTeam(teamId, athleteId);
      if (next) updated = next;
    }
    for (const athleteId of remove) {
      const next = await removeAthleteFromTeam(teamId, athleteId);
      if (next) updated = next;
    }

    return NextResponse.json({ team: updated, added: add.length, removed: remove.length });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
