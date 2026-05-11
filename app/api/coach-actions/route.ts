import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { env } from "@/config/env";
import { listCoachActionsByDate, upsertCoachAction } from "@/repositories/coach-actions.repository";
import type { CoachActionStatus } from "@/types/coach-action";

function stringValue(value: unknown, max = 240) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function statusValue(value: unknown): CoachActionStatus | null {
  return value === "acknowledged" || value === "applied" ? value : null;
}

async function resolveActor() {
  if (!env.surveyEnforceAuth) {
    return {
      actorName: "Habigoal Dev",
      actorEmail: "dev@habigoal.local"
    };
  }

  const { getSession } = await import("@/lib/session");
  const session = await getSession();

  return {
    actorName: session?.name || session?.email || "Unknown coach",
    actorEmail: session?.email || "unknown@habigoal.local"
  };
}

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const date = stringValue(searchParams.get("date"), 80) || new Date().toISOString().slice(0, 10);
    const actions = await listCoachActionsByDate(date);
    return NextResponse.json({ actions });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const athleteKey = stringValue(body?.athleteKey, 240);
    const date = stringValue(body?.date, 80) || new Date().toISOString().slice(0, 10);
    const recommendationKey = stringValue(body?.recommendationKey, 240);
    const status = statusValue(body?.status);

    if (!athleteKey || !recommendationKey || !status) {
      return jsonError("Invalid coach action payload", 400, "INVALID_PAYLOAD");
    }

    const actor = await resolveActor();
    const action = await upsertCoachAction({
      athleteKey,
      date,
      recommendationKey,
      status,
      actorName: actor.actorName,
      actorEmail: actor.actorEmail
    });

    return NextResponse.json(action);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
