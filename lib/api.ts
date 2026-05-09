import { NextResponse } from "next/server";
import { env } from "@/config/env";

const roleHeader = "x-survey-role";

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
  if (!env.surveyEnforceAuth) {
    return null;
  }

  const roleHeaderValue = request.headers.get(roleHeader)?.trim().toLowerCase() || "";
  const userRoles = roleHeaderValue.split(",").map(r => r.trim());

  if (userRoles.length === 0 || roleHeaderValue === "") {
    return jsonError("Missing role header", 401, "AUTH_REQUIRED");
  }

  const hasPermission = allowedRoles.some(role => userRoles.includes(role));
  if (!hasPermission) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return null;
}
