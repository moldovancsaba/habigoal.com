import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { getSession } from "@/lib/session";
import { findUserByEmail } from "@/repositories/user.repository";
import { listTeamsByAthleteId, listTeamsByTrainerEmail } from "@/repositories/team.repository";

export type AppRole = "admin" | "trainer" | "athlete";

const roleAliasMap: Record<string, AppRole> = {
  admin: "admin",
  trainer: "trainer",
  athlete: "athlete",
  conductor: "trainer",
  observer: "athlete"
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
  if (normalized.includes("trainer")) return "trainer";
  return "athlete";
}

export type AuthUser = {
  email: string;
  name: string;
  roles: AppRole[];
  primaryRole: AppRole;
  athleteId?: string;
  teamIds: string[];
};

export async function getAuthUser(): Promise<AuthUser | null> {
  if (!env.surveyEnforceAuth) {
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
    teamIds
  };
}

export async function resolveAccessibleAthleteIds(user: AuthUser): Promise<string[] | null> {
  if (user.primaryRole === "admin") {
    return null;
  }

  if (user.primaryRole === "athlete") {
    return user.athleteId ? [user.athleteId] : [];
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
