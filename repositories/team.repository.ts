import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { Team } from "@/types/team";
import { removeTeamIdFromUsers, syncTrainerTeamIds } from "@/repositories/user.repository";

const collectionName = "teams";

function normalizeTeam(doc: Record<string, unknown>): Team {
  const json = toJsonId(doc) as Record<string, unknown>;
  return {
    _id: typeof json._id === "string" ? json._id : undefined,
    name: typeof json.name === "string" ? json.name : "",
    clubName: typeof json.clubName === "string" ? json.clubName : undefined,
    unitName: typeof json.unitName === "string" ? json.unitName : undefined,
    seasonLabel: typeof json.seasonLabel === "string" ? json.seasonLabel : undefined,
    trainerEmails: Array.isArray(json.trainerEmails) ? json.trainerEmails.filter((item): item is string => typeof item === "string") : [],
    athleteIds: Array.isArray(json.athleteIds) ? json.athleteIds.filter((item): item is string => typeof item === "string") : [],
    notes: typeof json.notes === "string" ? json.notes : undefined,
    archived: typeof json.archived === "boolean" ? json.archived : false,
    createdAt: typeof json.createdAt === "string" ? json.createdAt : new Date().toISOString(),
    updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : new Date().toISOString()
  };
}

export async function listTeams(): Promise<Team[]> {
  const db = await getDatabase();
  const teams = await db.collection(collectionName).find({}).sort({ name: 1 }).toArray();
  return teams.map((team) => normalizeTeam(team as Record<string, unknown>));
}

export async function listTeamsByTrainerEmail(email: string): Promise<Team[]> {
  const db = await getDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const teams = await db.collection(collectionName).find({ trainerEmails: normalizedEmail }).sort({ name: 1 }).toArray();
  return teams.map((team) => normalizeTeam(team as Record<string, unknown>));
}

export async function listTeamsByAthleteId(athleteId: string): Promise<Team[]> {
  const db = await getDatabase();
  const teams = await db.collection(collectionName).find({ athleteIds: athleteId }).sort({ name: 1 }).toArray();
  return teams.map((team) => normalizeTeam(team as Record<string, unknown>));
}

export async function upsertTeam(input: Omit<Team, "_id" | "createdAt" | "updatedAt"> & { _id?: string }) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const payload = {
    name: input.name.trim(),
    clubName: input.clubName?.trim() || undefined,
    unitName: input.unitName?.trim() || undefined,
    seasonLabel: input.seasonLabel?.trim() || undefined,
    trainerEmails: Array.from(new Set(input.trainerEmails.map((value) => value.toLowerCase().trim()).filter(Boolean))),
    athleteIds: Array.from(new Set(input.athleteIds.map((value) => value.trim()).filter(Boolean))),
    notes: input.notes?.trim() || undefined,
    archived: Boolean(input.archived),
    updatedAt: now
  };

  if (input._id && ObjectId.isValid(input._id)) {
    const result = await db.collection(collectionName).findOneAndUpdate(
      { _id: new ObjectId(input._id) },
      { $set: payload },
      { returnDocument: "after" }
    );
    const normalized = result ? normalizeTeam(result as Record<string, unknown>) : null;
    if (normalized?._id) {
      await syncTrainerTeamIds(normalized._id, normalized.trainerEmails);
    }
    return normalized;
  }

  const result = await db.collection(collectionName).insertOne({
    ...payload,
    createdAt: now
  });
  const team = {
    _id: result.insertedId.toString(),
    ...payload,
    createdAt: now
  };
  await syncTrainerTeamIds(team._id, team.trainerEmails);
  return team;
}

export async function deleteTeamById(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDatabase();
  const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount > 0) {
    await removeTeamIdFromUsers(id);
  }
  return result.deletedCount > 0;
}
