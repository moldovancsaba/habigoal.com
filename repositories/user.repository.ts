import { getDatabase } from "@/lib/mongodb";
import type { User } from "@/services/user-service";

const collectionName = "users";

function mapUser(doc: any): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    roles: doc.roles || []
  };
}

export async function listAllUsers(): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection(collectionName).find({}).sort({ name: 1 }).toArray();
  return users.map(mapUser);
}

export async function listUsersByRole(role: "conductor" | "observer"): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection(collectionName)
    .find({ roles: role })
    .sort({ name: 1 })
    .toArray();
  return users.map(mapUser);
}

export async function upsertUser(user: Omit<User, "id">) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).updateOne(
    { name: user.name },
    { $set: user },
    { upsert: true }
  );
  return result;
}
