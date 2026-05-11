import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getSessionPlan, upsertSessionPlan } from "@/repositories/session-plans.repository";
import type { SessionPlanDay, SessionPlanVariant } from "@/types/session-plan";

function stringValue(value: unknown, max = 240) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function variantValue(value: unknown): SessionPlanVariant {
  return value === "recovery" || value === "controlled" ? value : "standard";
}

function dayValue(value: unknown): SessionPlanDay | null {
  const entry = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!entry) return null;

  const isoDate = stringValue(entry.isoDate, 80);
  if (!isoDate) return null;

  return {
    isoDate,
    variant: variantValue(entry.variant),
    focus: stringValue(entry.focus, 500),
    loadTarget: stringValue(entry.loadTarget, 240),
    coachNote: stringValue(entry.coachNote, 1000),
    athleteNames: Array.isArray(entry.athleteNames)
      ? entry.athleteNames.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 240))
      : []
  };
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
  const authError = requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const weekStart = stringValue(searchParams.get("weekStart"), 80);
    const scope = stringValue(searchParams.get("scope"), 240) || "all";

    if (!weekStart) {
      return jsonError("Missing weekStart", 400, "INVALID_QUERY");
    }

    const plan = await getSessionPlan(weekStart, scope);
    return NextResponse.json({ plan });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const weekStart = stringValue(body?.weekStart, 80);
    const scope = stringValue(body?.scope, 240) || "all";
    const variant = variantValue(body?.variant);
    const days = Array.isArray(body?.days) ? body?.days.map(dayValue).filter((item): item is SessionPlanDay => Boolean(item)) : [];
    const summary = body?.summary && typeof body.summary === "object" ? body.summary as Record<string, unknown> : {};

    if (!weekStart || days.length === 0) {
      return jsonError("Invalid session plan payload", 400, "INVALID_PAYLOAD");
    }

    const actor = await resolveActor();
    const plan = await upsertSessionPlan({
      weekStart,
      scope,
      variant,
      days,
      summary: {
        totalAthletes: numberValue(summary.totalAthletes),
        supportAthletes: numberValue(summary.supportAthletes),
        missingCheckIns: numberValue(summary.missingCheckIns),
        averageLoad: numberValue(summary.averageLoad)
      },
      actorName: actor.actorName,
      actorEmail: actor.actorEmail
    });

    return NextResponse.json(plan);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
