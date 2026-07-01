import { ObjectId, type Document, type UpdateFilter } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { Team } from "@/types/team";

const collectionName = "teams";

function normalizeTeam(doc: Record<string, unknown>): Team {
  const json = toJsonId(doc) as Record<string, unknown>;
  return {
    _id: typeof json._id === "string" ? json._id : undefined,
    name: typeof json.name === "string" ? json.name : "",
    trainerEmails: Array.isArray(json.trainerEmails) ? json.trainerEmails.filter((item): item is string => typeof item === "string") : [],
    athleteIds: Array.isArray(json.athleteIds) ? json.athleteIds.filter((item): item is string => typeof item === "string") : [],
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

export async function getTeamById(teamId: string): Promise<Team | null> {
  if (!ObjectId.isValid(teamId)) return null;
  const db = await getDatabase();
  const team = await db.collection(collectionName).findOne({ _id: new ObjectId(teamId) });
  return team ? normalizeTeam(team as Record<string, unknown>) : null;
}

export async function upsertTeam(input: Omit<Team, "_id" | "createdAt" | "updatedAt"> & { _id?: string }) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const payload = {
    name: input.name.trim(),
    trainerEmails: Array.from(new Set(input.trainerEmails.map((value) => value.toLowerCase().trim()).filter(Boolean))),
    athleteIds: Array.from(new Set(input.athleteIds.map((value) => value.trim()).filter(Boolean))),
    updatedAt: now
  };

  if (input._id && ObjectId.isValid(input._id)) {
    const result = await db.collection(collectionName).findOneAndUpdate(
      { _id: new ObjectId(input._id) },
      { $set: payload },
      { returnDocument: "after" }
    );
    return result ? normalizeTeam(result as Record<string, unknown>) : null;
  }

  const result = await db.collection(collectionName).insertOne({
    ...payload,
    createdAt: now
  });
  return {
    _id: result.insertedId.toString(),
    ...payload,
    createdAt: now
  };
}

export async function addAthleteToTeam(teamId: string, athleteId: string): Promise<Team | null> {
  if (!ObjectId.isValid(teamId)) return null;
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: new ObjectId(teamId) },
    { $addToSet: { athleteIds: athleteId.trim() }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  return result ? normalizeTeam(result as Record<string, unknown>) : null;
}

export async function removeAthleteFromTeam(teamId: string, athleteId: string): Promise<Team | null> {
  if (!ObjectId.isValid(teamId)) return null;
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: new ObjectId(teamId) },
    { $pull: { athleteIds: athleteId.trim() }, $set: { updatedAt: new Date().toISOString() } } as unknown as UpdateFilter<Document>,
    { returnDocument: "after" }
  );
  return result ? normalizeTeam(result as Record<string, unknown>) : null;
}

export async function addTrainerToTeam(teamId: string, email: string): Promise<Team | null> {
  if (!ObjectId.isValid(teamId)) return null;
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: new ObjectId(teamId) },
    { $addToSet: { trainerEmails: email.toLowerCase().trim() }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  return result ? normalizeTeam(result as Record<string, unknown>) : null;
}

export async function deleteTeamById(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDatabase();
  const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
