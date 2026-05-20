import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { getSession } from "@/lib/session";
import { normalizeRoles } from "@/lib/access";

const ROLE_HEADER = "x-habigoal-role";
const LEGACY_ROLE_HEADER = "x-survey-role";

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
  return normalizeRoles(value
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean));
}

export async function requireRole(request: Request, allowedRoles: string[]) {
  if (!env.habigoalEnforceAuth) {
    return null;
  }

  const roleHeaderValue =
    request.headers.get(ROLE_HEADER)?.trim().toLowerCase() ||
    request.headers.get(LEGACY_ROLE_HEADER)?.trim().toLowerCase() ||
    "";
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

  const normalizedAllowedRoles = normalizeRoles(allowedRoles);
  const hasPermission = normalizedAllowedRoles.some(role => userRoles.includes(role));
  if (!hasPermission) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return null;
}
