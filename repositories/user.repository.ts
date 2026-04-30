import { getDatabase } from "@/lib/mongodb";
import type { User } from "@/services/user-service";

const collectionName = "users";

function mapUser(doc: any): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    roles: doc.roles || [],
    googleToken: doc.googleToken
  };
}

export async function listAllUsers(): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection(collectionName).find({}).sort({ email: 1 }).toArray();
  return users.map(mapUser);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  const doc = await db.collection(collectionName).findOne({ email: email.toLowerCase().trim() });
  return doc ? mapUser(doc) : null;
}

export async function listUsersByRole(role: "admin" | "conductor" | "observer"): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection(collectionName)
    .find({ roles: role })
    .sort({ email: 1 })
    .toArray();
  return users.map(mapUser);
}

export async function upsertUser(user: Omit<User, "id">) {
  const db = await getDatabase();
  const normalizedEmail = user.email.toLowerCase().trim();
  const result = await db.collection(collectionName).updateOne(
    { email: normalizedEmail },
    { $set: { ...user, email: normalizedEmail } },
    { upsert: true }
  );
  return result;
}

export async function updateGoogleToken(email: string, token: any) {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { googleToken: token } }
  );
}

export async function deleteUserByEmail(email: string) {
  const db = await getDatabase();
  await db.collection(collectionName).deleteOne({ email: email.toLowerCase().trim() });
}
