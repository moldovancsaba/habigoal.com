import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { jsonError, requireRole } from "@/lib/api";
import { findConnectionById } from "@/repositories/device-connection.repository";
import { isSyncLocked, syncConnection } from "@/services/wearable-sync.service";

// POST /api/athletes/[id]/devices/[connectionId]/sync — manual "Sync now".
// Staff or the athlete themselves may sync their own device.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; connectionId: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach", "physio", "athlete"]);
  if (authError) return authError;

  try {
    const { id, connectionId } = await params;
    const authUser = await getAuthUser();
    if (!authUser || !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const connection = await findConnectionById(connectionId);
    if (!connection || connection.athleteId !== id) {
      return jsonError("Connection not found", 404, "NOT_FOUND");
    }

    if (isSyncLocked(connectionId)) {
      return jsonError("A sync is already running for this connection", 409, "SYNC_IN_PROGRESS");
    }

    let result;
    try {
      result = await syncConnection(connection);
    } catch (error) {
      // Provider/transport failure — lastSyncStatus is recorded as "error" by the
      // engine; surface a 502 so the client can retry.
      return jsonError(`Provider sync failed: ${(error as Error).message}`, 502, "PROVIDER_ERROR");
    }

    if (result.skipped === "in_progress") {
      return jsonError("A sync is already running for this connection", 409, "SYNC_IN_PROGRESS");
    }

    return NextResponse.json({ ok: true, persisted: result.persisted ?? 0, lastSyncedAt: result.lastSyncedAt });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
