import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { env } from "@/config/env";
import { listCoachActionsByDate, upsertCoachAction } from "@/repositories/coach-actions.repository";
import { logAuditEvent } from "@/lib/audit";
import type { CoachActionRecord, CoachActionSeverity, CoachActionStatus } from "@/types/coach-action";

function stringValue(value: unknown, max = 240) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function statusValue(value: unknown): CoachActionStatus | null {
  return value === "open" || value === "acknowledged" || value === "applied" || value === "resolved" || value === "ignored" || value === "overridden"
    ? value
    : null;
}

function severityValue(value: unknown): CoachActionSeverity | undefined {
  return value === "critical" || value === "warning" ? value : undefined;
}

function sourceTypeValue(value: unknown): CoachActionRecord["sourceType"] | undefined {
  return value === "missed-check-in" || value === "readiness-threshold" || value === "recommendation" ? value : undefined;
}

async function resolveActor() {
  if (!env.habigoalEnforceAuth) {
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
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
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
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const athleteKey = stringValue(body?.athleteKey, 240);
    const date = stringValue(body?.date, 80) || new Date().toISOString().slice(0, 10);
    const recommendationKey = stringValue(body?.recommendationKey, 240);
    const status = statusValue(body?.status);
    const severity = severityValue(body?.severity);
    const sourceType = sourceTypeValue(body?.sourceType);
    const sourceId = stringValue(body?.sourceId, 240);
    const detail = stringValue(body?.detail, 1000);

    if (!athleteKey || !recommendationKey || !status) {
      return jsonError("Invalid coach action payload", 400, "INVALID_PAYLOAD");
    }

    const actor = await resolveActor();
    const action = await upsertCoachAction({
      athleteKey,
      date,
      recommendationKey,
      status,
      severity,
      sourceType,
      sourceId,
      detail,
      actorName: actor.actorName,
      actorEmail: actor.actorEmail
    });

    const auditAction =
      status === "ignored"
        ? "recommendation.ignore"
        : status === "overridden"
          ? "recommendation.override"
          : status === "applied" || status === "acknowledged" || status === "resolved"
            ? "recommendation.accept"
            : null;

    if (auditAction) {
      await logAuditEvent({
        actorEmail: actor.actorEmail,
        actorRole: "trainer",
        action: auditAction,
        resourceType: "coach_action",
        resourceId: recommendationKey,
        metadata: { athleteKey, date, status, detail },
      });
    }

    return NextResponse.json(action);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
