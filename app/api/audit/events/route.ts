import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { hasCapability } from "@/lib/permissions";
import { listAuditEvents } from "@/repositories/audit-event.repository";
import { jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !hasCapability(user.roles, "audit:read")) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "100");

  const events = await listAuditEvents({ resourceId, action, limit });
  return NextResponse.json({ events });
}
