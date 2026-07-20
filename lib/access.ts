import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { hasProductEntitlement, resolveProductEntitlements, type ProductEntitlements, type ProductSurfaceId } from "@/lib/product-entitlements";
import { getSession } from "@/lib/session";
import { findUserByEmail } from "@/repositories/user.repository";
import { getTeamById, listTeamsByAthleteId, listTeamsByTrainerEmail } from "@/repositories/team.repository";
import type { Team } from "@/types/team";

export type AppRole = "admin" | "trainer" | "athlete" | "parent" | "performance_coach" | "physio" | "analyst" | "club_management";

const roleAliasMap: Record<string, AppRole> = {
  admin: "admin",
  trainer: "trainer",
  athlete: "athlete",
  parent: "parent",
  guardian: "parent",
  performance_coach: "performance_coach",
  physio: "physio",
  analyst: "analyst",
  club_management: "club_management",
  conductor: "trainer",
  observer: "athlete",
  coach: "trainer",
  management: "club_management",
};

export function normalizeRole(role: string): AppRole | null {
  return roleAliasMap[role.trim().toLowerCase()] || null;
}

export function normalizeRoles(roles: string[] | undefined | null): AppRole[] {
  return Array.from(new Set((roles || []).map((role) => normalizeRole(role)).filter((role): role is AppRole => Boolean(role))));
}

export function getPrimaryRole(roles: string[] | undefined | null): AppRole {
  const normalized = normalizeRoles(roles);
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("club_management")) return "club_management";
  if (normalized.includes("trainer")) return "trainer";
  if (normalized.includes("performance_coach")) return "performance_coach";
  if (normalized.includes("physio")) return "physio";
  if (normalized.includes("analyst")) return "analyst";
  if (normalized.includes("parent")) return "parent";
  return "athlete";
}

export type AuthUser = {
  id?: string;
  email: string;
  name: string;
  roles: AppRole[];
  primaryRole: AppRole;
  athleteId?: string;
  parentAthleteIds?: string[];
  productEntitlements: ProductEntitlements;
  teamIds: string[];
};

export type AuthUserOptions = {
  productSurface?: ProductSurfaceId;
};

export type ProductApiPersona = "habigoal_user" | "athlete" | "trainer" | "admin";

export type ProductApiPrincipal = AuthUser & {
  persona: ProductApiPersona;
  productSurface: ProductSurfaceId | "shared";
};

const TRAINER_API_ROLES = new Set<AppRole>(["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"]);

function authBypassAllowed() {
  return !env.habigoalEnforceAuth && process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
}

export async function getAuthUser(options: AuthUserOptions = {}): Promise<AuthUser | null> {
  if (!env.habigoalEnforceAuth) {
    if (!authBypassAllowed()) return null;
    const devUser: AuthUser = {
      email: "dev@habigoal.local",
      name: "Habigoal Dev",
      roles: ["admin", "trainer", "athlete"],
      primaryRole: "admin",
      productEntitlements: {
        habigoal: { enabled: true, reason: "admin_grant" },
        athleteIq: { enabled: true, reason: "admin_grant" }
      },
      teamIds: []
    };
    return options.productSurface && !canOpenProductSurface(devUser, options.productSurface) ? null : devUser;
  }

  const session = await getSession();
  if (!session?.email) return null;
  const localUser = await findUserByEmail(session.email);
  if (!localUser) return null;

  const roles = normalizeRoles(localUser.roles);
  const productEntitlements = resolveProductEntitlements(localUser);
  const teamIds = Array.isArray(localUser.teamIds) ? localUser.teamIds : [];
  const sessionRoles = normalizeRoles(session.role?.split(",") ?? []);
  const primaryRole = resolveSessionPrimaryRole(sessionRoles, roles);

  const user: AuthUser = {
    id: localUser.id,
    email: localUser.email,
    name: localUser.name || session.name || localUser.email,
    roles,
    primaryRole,
    athleteId: localUser.athleteId,
    parentAthleteIds: localUser.parentAthleteIds,
    productEntitlements,
    teamIds
  };

  if (options.productSurface && !canOpenProductSurface(user, options.productSurface)) return null;
  return user;
}

function resolveSessionPrimaryRole(sessionRoles: AppRole[], userRoles: AppRole[]) {
  const usableSessionRoles = sessionRoles.filter((role) => userRoles.includes(role));
  if (usableSessionRoles.length === 1) return usableSessionRoles[0];
  if (usableSessionRoles.length > 1) return getPrimaryRole(usableSessionRoles);
  return getPrimaryRole(userRoles);
}

export async function resolveAccessibleAthleteIds(user: AuthUser): Promise<string[] | null> {
  if (user.primaryRole === "admin" || user.primaryRole === "club_management" || user.primaryRole === "analyst") {
    return null;
  }

  if (user.primaryRole === "athlete") {
    return user.athleteId ? [user.athleteId] : [];
  }

  if (user.primaryRole === "parent") {
    return user.parentAthleteIds?.length ? user.parentAthleteIds : [];
  }

  const [emailTeams, assignedTeams] = await Promise.all([
    listTeamsByTrainerEmail(user.email),
    Promise.all(user.teamIds.map((teamId) => getTeamById(teamId)))
  ]);
  const teams = dedupeTeams([...emailTeams, ...assignedTeams.filter((team): team is Team => Boolean(team))]);
  return Array.from(new Set(teams.flatMap((team) => team.athleteIds || [])));
}

export async function resolveAccessibleTeamIds(user: AuthUser): Promise<string[] | null> {
  if (user.primaryRole === "admin" || user.primaryRole === "club_management" || user.primaryRole === "analyst") {
    return null;
  }

  if (user.primaryRole === "athlete") {
    return user.athleteId ? getAthleteTeamIds(user.athleteId) : [];
  }

  if (user.primaryRole === "parent") {
    const athleteIds = user.parentAthleteIds ?? [];
    const teamIdsByAthlete = await Promise.all(athleteIds.map((athleteId) => getAthleteTeamIds(athleteId)));
    return Array.from(new Set(teamIdsByAthlete.flat()));
  }

  const [emailTeams, assignedTeams] = await Promise.all([
    listTeamsByTrainerEmail(user.email),
    Promise.all(user.teamIds.map((teamId) => getTeamById(teamId)))
  ]);
  return dedupeTeams([...emailTeams, ...assignedTeams.filter((team): team is Team => Boolean(team))])
    .map((team) => team._id)
    .filter((teamId): teamId is string => Boolean(teamId));
}

function dedupeTeams(teams: Team[]) {
  const seen = new Set<string>();
  return teams.filter((team) => {
    const key = team._id ?? team.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function canAccessAthlete(user: AuthUser, athleteId: string): Promise<boolean> {
  if (!ObjectId.isValid(athleteId) && !athleteId) return false;
  const allowedIds = await resolveAccessibleAthleteIds(user);
  if (allowedIds === null) return true;
  return allowedIds.includes(athleteId);
}

export function canOpenProductSurface(user: { productEntitlements?: ProductEntitlements; roles?: string[] | null }, surface: ProductSurfaceId) {
  return hasProductEntitlement(resolveProductEntitlements(user), surface);
}

export async function requireHabigoalApiUser(): Promise<ProductApiPrincipal | null> {
  const user = await getAuthUser({ productSurface: "habigoal" });
  if (!user) return null;
  return { ...user, persona: "habigoal_user", productSurface: "habigoal" };
}

export async function requireAthleteIqApiUser(): Promise<ProductApiPrincipal | null> {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return null;
  return { ...user, persona: user.primaryRole === "athlete" ? "athlete" : resolveTrainerPersona(user), productSurface: "athlete-iq" };
}

export async function requireAthleteIqTrainerApiUser(): Promise<ProductApiPrincipal | null> {
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user || !TRAINER_API_ROLES.has(user.primaryRole)) return null;
  return { ...user, persona: resolveTrainerPersona(user), productSurface: "athlete-iq" };
}

export async function requireAdminApiUser(): Promise<ProductApiPrincipal | null> {
  const user = await getAuthUser();
  if (!user || user.primaryRole !== "admin") return null;
  return { ...user, persona: "admin", productSurface: "shared" };
}

export async function canAccessAthleteIqAthlete(user: AuthUser, athleteId: string): Promise<boolean> {
  if (!canOpenProductSurface(user, "athlete-iq")) return false;
  return canAccessAthlete(user, athleteId);
}

export async function canAccessHabigoalAthlete(user: AuthUser, athleteId: string): Promise<boolean> {
  if (!canOpenProductSurface(user, "habigoal")) return false;
  return Boolean(user.athleteId && user.athleteId === athleteId);
}

export async function getAthleteTeamIds(athleteId: string): Promise<string[]> {
  const teams = await listTeamsByAthleteId(athleteId);
  return teams.map((team) => team._id!).filter(Boolean);
}

function resolveTrainerPersona(user: AuthUser): ProductApiPersona {
  return user.primaryRole === "admin" ? "admin" : "trainer";
}
