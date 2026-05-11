import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { getSession } from "@/lib/session";

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

function parseRoles(value: string) {
  return value
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireRole(request: Request, allowedRoles: string[]) {
  if (!env.surveyEnforceAuth) {
    return null;
  }

  const roleHeaderValue = request.headers.get(roleHeader)?.trim().toLowerCase() || "";
  let userRoles = parseRoles(roleHeaderValue);

  if (userRoles.length === 0) {
    const session = await getSession();
    if (session?.role) {
      userRoles = parseRoles(session.role);
    }
  }

  if (userRoles.length === 0) {
    return jsonError("Authentication required", 401, "AUTH_REQUIRED");
  }

  const hasPermission = allowedRoles.some(role => userRoles.includes(role));
  if (!hasPermission) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return null;
}
