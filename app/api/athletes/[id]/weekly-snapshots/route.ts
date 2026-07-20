import { NextResponse } from "next/server";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { hasCapability } from "@/lib/permissions";
import { jsonError, readJson } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";
import {
  generateWeeklySnapshot,
  getStoredWeeklySnapshot,
  listStoredWeeklySnapshots,
} from "@/services/weekly-snapshot.service";

function weekStartValue(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 10).trim() : "";
}

// Versioned weekly snapshots (#86). GET lists snapshots, returns one by
// ?weekStart=, or downloads it with ?weekStart=&format=json. POST generates (or
// regenerates) and persists the snapshot for a week. Authorized + athlete-scoped.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser({ productSurface: "athlete-iq" });
    if (!user || !hasCapability(user.roles, "report:read")) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    const { id } = await params;
    if (!(await canAccessAthlete(user, id))) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const url = new URL(request.url);
    const weekStart = weekStartValue(url.searchParams.get("weekStart"));

    if (weekStart) {
      const snapshot = await getStoredWeeklySnapshot(id, weekStart);
      if (!snapshot) return jsonError("Snapshot not found", 404, "NOT_FOUND");

      if (url.searchParams.get("format") === "json") {
        if (!hasCapability(user.roles, "report:export")) {
          return jsonError("Insufficient permissions", 403, "FORBIDDEN");
        }
        await logAuditEvent({
          actorEmail: user.email,
          actorRole: user.primaryRole,
          action: "weekly_snapshot.export",
          resourceType: "athlete",
          resourceId: id,
        });
        return new NextResponse(JSON.stringify(snapshot, null, 2), {
          headers: {
            "content-type": "application/json",
            "content-disposition": `attachment; filename="weekly-snapshot-${id}-${weekStart}.json"`,
          },
        });
      }
      return NextResponse.json({ snapshot });
    }

    return NextResponse.json({ snapshots: await listStoredWeeklySnapshots(id) });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser({ productSurface: "athlete-iq" });
    if (!user || !hasCapability(user.roles, "report:export")) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    const { id } = await params;
    if (!(await canAccessAthlete(user, id))) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const body = (await readJson(request)) as Record<string, unknown> | null;
    const weekStart = weekStartValue(body?.weekStart);
    if (!weekStart) return jsonError("Missing weekStart", 400, "INVALID_PAYLOAD");

    const snapshot = await generateWeeklySnapshot({
      athleteId: id,
      weekStart,
      createdBy: user.email,
      createdAt: new Date().toISOString(),
    });

    await logAuditEvent({
      actorEmail: user.email,
      actorRole: user.primaryRole,
      action: "weekly_snapshot.generate",
      resourceType: "athlete",
      resourceId: id,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
