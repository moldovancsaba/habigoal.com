import { NextResponse } from "next/server";
import { env } from "@/config/env";

const roleHeader = "x-kidex-role";

export function jsonError(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { error: message, code: code || "UNKNOWN_ERROR" },
    { status }
  );
}

export async function readJson(request: Request): Promise<unknown | null> {
  return request.json().catch(() => null);
}

export function requireRole(request: Request, allowedRoles: string[]) {
  if (!env.kidexEnforceAuth) {
    return null;
  }

  const role = request.headers.get(roleHeader)?.trim().toLowerCase();
  if (!role) {
    return jsonError("Missing role header", 401, "AUTH_REQUIRED");
  }

  if (!allowedRoles.includes(role)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return null;
}
