import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { getSession } from "@/lib/session";
import { findUserByEmail } from "@/repositories/user.repository";
import { listTeamsByAthleteId, listTeamsByTrainerEmail } from "@/repositories/team.repository";

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
  email: string;
  name: string;
  roles: AppRole[];
  primaryRole: AppRole;
  athleteId?: string;
  parentAthleteIds?: string[];
  teamIds: string[];
};

export async function getAuthUser(): Promise<AuthUser | null> {
  if (!env.habigoalEnforceAuth) {
    return {
      email: "dev@habigoal.local",
      name: "Habigoal Dev",
      roles: ["admin", "trainer", "athlete"],
      primaryRole: "admin",
      teamIds: []
    };
  }

  const session = await getSession();
  if (!session?.email) return null;
  const localUser = await findUserByEmail(session.email);
  if (!localUser) return null;

  const roles = normalizeRoles(localUser.roles);
  const teamIds = Array.isArray(localUser.teamIds) ? localUser.teamIds : [];

  return {
    email: localUser.email,
    name: localUser.name || session.name || localUser.email,
    roles,
    primaryRole: getPrimaryRole(roles),
    athleteId: localUser.athleteId,
    parentAthleteIds: localUser.parentAthleteIds,
    teamIds
  };
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

  const teams = await listTeamsByTrainerEmail(user.email);
  return Array.from(new Set(teams.flatMap((team) => team.athleteIds || [])));
}

export async function canAccessAthlete(user: AuthUser, athleteId: string): Promise<boolean> {
  if (!ObjectId.isValid(athleteId) && !athleteId) return false;
  const allowedIds = await resolveAccessibleAthleteIds(user);
  if (allowedIds === null) return true;
  return allowedIds.includes(athleteId);
}

export async function getAthleteTeamIds(athleteId: string): Promise<string[]> {
  const teams = await listTeamsByAthleteId(athleteId);
  return teams.map((team) => team._id!).filter(Boolean);
}
