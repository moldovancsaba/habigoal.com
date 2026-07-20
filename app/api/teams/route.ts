import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser, resolveAccessibleTeamIds } from "@/lib/access";
import { deleteTeamById, listTeams, upsertTeam } from "@/repositories/team.repository";

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
    const allowedTeamIds = await resolveAccessibleTeamIds(authUser);
    const teams = await listTeams();
    const scopedTeams = allowedTeamIds === null ? teams : teams.filter((team) => team._id && allowedTeamIds.includes(team._id));
    return NextResponse.json({ teams: scopedTeams });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonError("Team name is required", 400, "VALIDATION_ERROR");
    }

    const team = await upsertTeam({
      _id: typeof body?._id === "string" ? body._id : undefined,
      name,
      trainerEmails: stringArray(body?.trainerEmails),
      athleteIds: stringArray(body?.athleteIds)
    });

    return NextResponse.json({ team });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return jsonError("Team id is required", 400, "VALIDATION_ERROR");
    }
    const success = await deleteTeamById(id);
    return NextResponse.json({ success });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
