import { getDatabase } from "@/lib/mongodb";
import type { User } from "@/services/user-service";

const collectionName = "users";

function mapUser(doc: any): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    roles: doc.roles || [],
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
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
  const now = new Date().toISOString();
  const result = await db.collection(collectionName).updateOne(
    { email: normalizedEmail },
    {
      $set: {
        ...user,
        email: normalizedEmail,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );
  return result;
}

export async function deleteUserByEmail(email: string) {
  const db = await getDatabase();
  await db.collection(collectionName).deleteOne({ email: email.toLowerCase().trim() });
}

export async function markUserLogin(email: string, name?: string) {
  const db = await getDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        updatedAt: now,
        lastLoginAt: now,
        ...(name ? { name } : {})
      },
      $setOnInsert: {
        createdAt: now
      }
    }
  );
}
