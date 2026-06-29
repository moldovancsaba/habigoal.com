export type ProductSurfaceId = "habigoal" | "athlete-iq";

export type HabigoalEntitlementReason = "self_registered" | "aiq_member" | "admin_grant";
export type AthleteIqEntitlementReason =
  | "team_athlete"
  | "pro_athlete_membership"
  | "trainer_assignment"
  | "club_staff"
  | "admin_grant";

export type ProductEntitlements = {
  habigoal: {
    enabled: boolean;
    grantedAt?: string;
    reason: HabigoalEntitlementReason;
  };
  athleteIq: {
    enabled: boolean;
    grantedAt?: string;
    reason?: AthleteIqEntitlementReason;
  };
};

const PROFESSIONAL_ROLES = new Set(["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"]);

export function normalizeProductEntitlements(input: unknown): ProductEntitlements | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const habigoal = isRecord(raw.habigoal) ? raw.habigoal : {};
  const athleteIq = isRecord(raw.athleteIq) ? raw.athleteIq : {};

  return {
    habigoal: {
      enabled: Boolean(habigoal.enabled),
      grantedAt: typeof habigoal.grantedAt === "string" ? habigoal.grantedAt : undefined,
      reason: normalizeHabigoalReason(habigoal.reason)
    },
    athleteIq: {
      enabled: Boolean(athleteIq.enabled),
      grantedAt: typeof athleteIq.grantedAt === "string" ? athleteIq.grantedAt : undefined,
      reason: normalizeAthleteIqReason(athleteIq.reason)
    }
  };
}

export function createSelfRegisteredEntitlements(now = new Date().toISOString()): ProductEntitlements {
  return {
    habigoal: {
      enabled: true,
      grantedAt: now,
      reason: "self_registered"
    },
    athleteIq: {
      enabled: false
    }
  };
}

export function deriveLegacyProductEntitlements(roles: string[] | undefined | null, now = new Date().toISOString()): ProductEntitlements {
  const normalized = new Set((roles || []).map((role) => role.trim().toLowerCase()));
  const hasProfessionalRole = Array.from(normalized).some((role) => PROFESSIONAL_ROLES.has(role));
  const isAdmin = normalized.has("admin");

  return {
    habigoal: {
      enabled: true,
      grantedAt: now,
      reason: hasProfessionalRole ? "aiq_member" : "self_registered"
    },
    athleteIq: {
      enabled: hasProfessionalRole,
      grantedAt: hasProfessionalRole ? now : undefined,
      reason: hasProfessionalRole ? (isAdmin ? "admin_grant" : "trainer_assignment") : undefined
    }
  };
}

export function resolveProductEntitlements(input: {
  productEntitlements?: unknown;
  roles?: string[] | null;
}): ProductEntitlements {
  return normalizeProductEntitlements(input.productEntitlements) ?? deriveLegacyProductEntitlements(input.roles);
}

export function resolvePersonaLoginEntitlements(input: {
  existingProductEntitlements?: unknown;
  existingRoles?: string[] | null;
  requestedRoles?: string[] | null;
  requestedSurface?: ProductSurfaceId;
  now?: string;
}): ProductEntitlements {
  const requestedRoles = normalizeRoleSet(input.requestedRoles);
  const explicit = normalizeProductEntitlements(input.existingProductEntitlements);
  if (explicit) return grantRequestedProfessionalEntitlement(explicit, requestedRoles, input.now, input.requestedSurface);
  const combinedRoles = [...normalizeRoleSet(input.existingRoles), ...requestedRoles];
  if (input.requestedSurface === "athlete-iq" && requestedRoles.includes("athlete")) {
    return createAthleteIqAthleteEntitlements(input.now);
  }
  if (combinedRoles.length > 0) {
    return deriveLegacyProductEntitlements(combinedRoles, input.now);
  }
  return createSelfRegisteredEntitlements(input.now);
}

export function hasProductEntitlement(entitlements: ProductEntitlements, surface: ProductSurfaceId) {
  return surface === "habigoal" ? entitlements.habigoal.enabled : entitlements.athleteIq.enabled;
}

// What a given product surface's CLIENT is allowed to see of a user's
// entitlements. The consumer (Habigoal) surface must never receive the
// professional product's entitlement or any reason codes
// (e.g. trainer_assignment, pro_athlete_membership) — that is a product-boundary
// leak (#432). Reason codes and grant timestamps are server-only concerns and
// are dropped for BOTH surfaces; the consumer additionally never sees the
// athleteIq key at all. Accepts the broad shape returned by lib/access so callers
// don't have to normalize first.
export type SurfaceScopedEntitlements =
  | { habigoal: { enabled: boolean } }
  | { habigoal: { enabled: boolean }; athleteIq: { enabled: boolean } };

export function projectEntitlementsForSurface(
  entitlements: Pick<ProductEntitlements, "habigoal" | "athleteIq"> | undefined | null,
  surface: ProductSurfaceId
): SurfaceScopedEntitlements {
  const habigoalEnabled = Boolean(entitlements?.habigoal?.enabled);
  if (surface === "habigoal") {
    return { habigoal: { enabled: habigoalEnabled } };
  }
  return {
    habigoal: { enabled: habigoalEnabled },
    athleteIq: { enabled: Boolean(entitlements?.athleteIq?.enabled) }
  };
}

function normalizeHabigoalReason(input: unknown): HabigoalEntitlementReason {
  if (input === "aiq_member" || input === "admin_grant" || input === "self_registered") return input;
  return "self_registered";
}

function normalizeRoleSet(roles: string[] | undefined | null) {
  return Array.from(new Set((roles || []).map((role) => role.trim().toLowerCase()).filter(Boolean)));
}

function grantRequestedProfessionalEntitlement(
  entitlements: ProductEntitlements,
  requestedRoles: string[],
  now = new Date().toISOString(),
  requestedSurface?: ProductSurfaceId
): ProductEntitlements {
  const hasRequestedProfessionalRole = requestedRoles.some((role) => PROFESSIONAL_ROLES.has(role));
  const hasRequestedAthleteIqAthlete = requestedSurface === "athlete-iq" && requestedRoles.includes("athlete");
  if (!hasRequestedProfessionalRole && !hasRequestedAthleteIqAthlete) return entitlements;
  const isAdmin = requestedRoles.includes("admin");

  return {
    habigoal: {
      enabled: true,
      grantedAt: entitlements.habigoal.grantedAt ?? now,
      reason: entitlements.habigoal.reason === "admin_grant" ? "admin_grant" : "aiq_member"
    },
    athleteIq: {
      enabled: true,
      grantedAt: entitlements.athleteIq.grantedAt ?? now,
      reason: entitlements.athleteIq.reason ?? (hasRequestedAthleteIqAthlete ? "pro_athlete_membership" : isAdmin ? "admin_grant" : "trainer_assignment")
    }
  };
}

function createAthleteIqAthleteEntitlements(now = new Date().toISOString()): ProductEntitlements {
  return {
    habigoal: {
      enabled: true,
      grantedAt: now,
      reason: "aiq_member"
    },
    athleteIq: {
      enabled: true,
      grantedAt: now,
      reason: "pro_athlete_membership"
    }
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object";
}

function normalizeAthleteIqReason(input: unknown): AthleteIqEntitlementReason | undefined {
  if (
    input === "team_athlete" ||
    input === "pro_athlete_membership" ||
    input === "trainer_assignment" ||
    input === "club_staff" ||
    input === "admin_grant"
  ) {
    return input;
  }
  return undefined;
}
