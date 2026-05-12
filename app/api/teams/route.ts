import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser } from "@/lib/access";
import { deleteTeamById, listTeams, listTeamsByTrainerEmail, upsertTeam } from "@/repositories/team.repository";

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function stringValue(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const authUser = await getAuthUser();
    const teams = authUser?.primaryRole === "trainer" ? await listTeamsByTrainerEmail(authUser.email) : await listTeams();
    return NextResponse.json({ teams });
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
      clubName: stringValue(body?.clubName) || undefined,
      unitName: stringValue(body?.unitName) || undefined,
      seasonLabel: stringValue(body?.seasonLabel, 120) || undefined,
      trainerEmails: stringArray(body?.trainerEmails),
      athleteIds: stringArray(body?.athleteIds),
      notes: stringValue(body?.notes, 2000) || undefined,
      archived: body?.archived === true
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
