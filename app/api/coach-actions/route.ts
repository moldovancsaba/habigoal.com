import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { env } from "@/config/env";
import {
  listCoachActionsByDate,
  listCoachActions,
  bulkSetCoachActionStatus,
  upsertCoachAction,
  type CoachActionKey,
} from "@/repositories/coach-actions.repository";
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
  return value === "missed-check-in" || value === "readiness-threshold" || value === "recommendation" || value === "pain-safety" || value === "daily-engine" ? value : undefined;
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
    const from = stringValue(searchParams.get("from"), 80);
    const to = stringValue(searchParams.get("to"), 80);
    const statusParam = stringValue(searchParams.get("status"), 200);
    const severity = severityValue(searchParams.get("severity"));
    const sourceType = sourceTypeValue(searchParams.get("sourceType"));
    const athleteKey = stringValue(searchParams.get("athleteKey"), 240);
    const limit = Number.parseInt(stringValue(searchParams.get("limit"), 8), 10);
    const statuses = statusParam
      ? statusParam.split(",").map((s) => statusValue(s.trim())).filter((s): s is CoachActionStatus => s !== null)
      : [];

    // Filtered / history query when any filter is supplied; otherwise keep the
    // original single-day behavior for backward compatibility.
    if (from || to || statuses.length || severity || sourceType || athleteKey) {
      const explicitDate = stringValue(searchParams.get("date"), 80);
      const actions = await listCoachActions(
        { date: explicitDate || undefined, from: from || undefined, to: to || undefined, statuses, severity, sourceType, athleteKey: athleteKey || undefined },
        Number.isFinite(limit) ? limit : 200
      );
      return NextResponse.json({ actions });
    }

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

    // Bulk status transition: { items: [{athleteKey,date,recommendationKey}], status }
    if (Array.isArray(body?.items)) {
      const bulkStatus = statusValue(body?.status);
      if (!bulkStatus) return jsonError("Invalid bulk status", 400, "INVALID_PAYLOAD");
      const keys: CoachActionKey[] = (body!.items as unknown[])
        .map((item) => {
          const record = item as Record<string, unknown>;
          return {
            athleteKey: stringValue(record?.athleteKey, 240),
            date: stringValue(record?.date, 80),
            recommendationKey: stringValue(record?.recommendationKey, 240),
          };
        })
        .filter((key) => key.athleteKey && key.date && key.recommendationKey);
      if (keys.length === 0) return jsonError("No valid items in bulk payload", 400, "INVALID_PAYLOAD");

      const bulkActor = await resolveActor();
      const updated = await bulkSetCoachActionStatus({ keys, status: bulkStatus, actorName: bulkActor.actorName, actorEmail: bulkActor.actorEmail });
      await logAuditEvent({
        actorEmail: bulkActor.actorEmail,
        actorRole: "trainer",
        action: "recommendation.accept",
        resourceType: "coach_action",
        resourceId: "bulk",
        metadata: { status: bulkStatus, requested: keys.length, updated },
      });
      return NextResponse.json({ updated, requested: keys.length });
    }

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
