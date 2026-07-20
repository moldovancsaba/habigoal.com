import { NextResponse } from "next/server";
import { getAuthUser, normalizeRoles } from "@/lib/access";
import { resolveApiRouteContract } from "@/lib/api-access-registry";
import type { ProductSurfaceId } from "@/lib/product-entitlements";
import { hasCapability, type Capability } from "@/lib/permissions";

export const STAFF_ROLES = ["admin", "trainer", "performance_coach", "physio", "analyst", "club_management", "parent"];
export const COACHING_ROLES = ["admin", "trainer", "performance_coach"];
export const MEDICAL_ROLES = ["admin", "physio", "trainer"];

export function jsonError(message: string, status = 500, code?: string) {
  const publicMessage = status >= 500 ? "Internal Server Error" : message;
  return NextResponse.json(
    { error: publicMessage, code: code || "UNKNOWN_ERROR" },
    { status }
  );
}

export async function readJson(request: Request): Promise<unknown | null> {
  return request.json().catch(() => null);
}

function userRolesFromSessionRole(value?: string | null) {
  return normalizeRoles((value || "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean));
}

export async function requireRole(_request: Request, allowedRoles: string[]) {
  const productSurface = resolveRequiredProductSurface(_request);
  const user = await getAuthUser(productSurface ? { productSurface } : {});
  if (!user && productSurface) {
    const authenticatedUser = await getAuthUser();
    if (authenticatedUser) {
      return jsonError("Product access denied", 403, "PRODUCT_ACCESS_DENIED");
    }
  }
  const userRoles = user?.roles.length ? user.roles : userRolesFromSessionRole(user?.primaryRole);

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

export async function requireCapability(_request: Request, capability: Capability) {
  const user = await getAuthUser();
  const userRoles = user?.roles.length ? user.roles : userRolesFromSessionRole(user?.primaryRole);
  if (userRoles.length === 0) return jsonError("Authentication required", 401, "AUTH_REQUIRED");
  if (!hasCapability(userRoles, capability)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }
  return null;
}

function resolveRequiredProductSurface(request: Request): ProductSurfaceId | undefined {
  const contract = resolveApiRouteContract(requestPathname(request));
  if (contract?.productSurface === "athlete_iq") return "athlete-iq";
  if (contract?.productSurface === "habigoal") return "habigoal";
  return undefined;
}

function requestPathname(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}
