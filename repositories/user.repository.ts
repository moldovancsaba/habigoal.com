import { getDatabase } from "@/lib/mongodb";
import type { User } from "@/services/user-service";
import { normalizeRoles } from "@/lib/access";
import {
  normalizeProductEntitlements,
  resolvePersonaLoginEntitlements,
  resolveProductEntitlements,
  type ProductEntitlements
} from "@/lib/product-entitlements";

const collectionName = "users";

function mapUser(doc: any): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    roles: normalizeRoles(doc.roles || []),
    athleteId: doc.athleteId,
    parentAthleteIds: doc.parentAthleteIds || [],
    productEntitlements: resolveProductEntitlements({
      productEntitlements: doc.productEntitlements,
      roles: doc.roles || []
    }),
    teamIds: doc.teamIds || [],
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
  const normalizedEmail = email.toLowerCase().trim();
  const doc = await db.collection(collectionName).findOne({
    $or: [
      { normalizedEmail },
      { email: normalizedEmail }
    ]
  });
  return doc ? mapUser(doc) : null;
}

export async function listUsersByRole(role: "admin" | "trainer" | "athlete"): Promise<User[]> {
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
  const normalizedRoles = normalizeRoles(user.roles || []);
  const now = new Date().toISOString();
  const existing = await db.collection(collectionName).findOne({
    $or: [
      { normalizedEmail },
      { email: normalizedEmail }
    ]
  });
  const result = await db.collection(collectionName).updateOne(
    existing?._id ? { _id: existing._id } : { normalizedEmail },
    {
      $set: {
        ...user,
        email: normalizedEmail,
        normalizedEmail,
        roles: normalizedRoles,
        productEntitlements: normalizeProductEntitlements(user.productEntitlements) ?? resolveProductEntitlements({ roles: normalizedRoles }),
        teamIds: user.teamIds || [],
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

export async function upsertPersonaLoginUser(user: Pick<User, "email" | "name" | "roles"> & { productSurface?: "habigoal" | "athlete-iq" }): Promise<User | null> {
  const db = await getDatabase();
  const normalizedEmail = user.email.toLowerCase().trim();
  const normalizedRoles = normalizeRoles(user.roles || []);
  const now = new Date().toISOString();
  const existing = await db.collection(collectionName).findOne({
    $or: [
      { normalizedEmail },
      { email: normalizedEmail }
    ]
  });
  const mergedRoles = normalizeRoles([...(Array.isArray(existing?.roles) ? existing.roles : []), ...normalizedRoles]);
  const productEntitlements = resolvePersonaLoginEntitlements({
    existingProductEntitlements: existing?.productEntitlements,
    existingRoles: Array.isArray(existing?.roles) ? existing.roles : [],
    requestedRoles: normalizedRoles,
    requestedSurface: user.productSurface,
    now
  });
  await db.collection(collectionName).updateOne(
    existing?._id ? { _id: existing._id } : { normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        normalizedEmail,
        name: user.name || normalizedEmail,
        productEntitlements,
        roles: mergedRoles,
        updatedAt: now,
        lastLoginAt: now
      },
      $setOnInsert: {
        createdAt: now,
        teamIds: []
      }
    },
    { upsert: true }
  );
  return findUserByEmail(normalizedEmail);
}

export async function setUserProductEntitlements(email: string, productEntitlements: ProductEntitlements) {
  const db = await getDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { $or: [{ normalizedEmail }, { email: normalizedEmail }] },
    {
      $set: {
        normalizedEmail,
        productEntitlements: normalizeProductEntitlements(productEntitlements),
        updatedAt: now
      }
    }
  );
}

export async function setUserAthleteId(email: string, athleteId: string) {
  const db = await getDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { $or: [{ normalizedEmail }, { email: normalizedEmail }] },
    {
      $set: {
        athleteId,
        normalizedEmail,
        updatedAt: now
      },
      $addToSet: {
        roles: "athlete"
      }
    }
  );
}

// Replace a user's role set wholesale (used by admin governance actions, GH-152).
// Roles are normalized so aliases and duplicates can't leak in.
export async function setUserRoles(email: string, roles: string[]) {
  const db = await getDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedRoles = normalizeRoles(roles);
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { $or: [{ normalizedEmail }, { email: normalizedEmail }] },
    {
      $set: {
        roles: normalizedRoles,
        normalizedEmail,
        updatedAt: now
      }
    }
  );
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
