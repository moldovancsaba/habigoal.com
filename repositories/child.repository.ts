import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";

export interface ChildProfile {
  _id?: string;
  name: string;
  birthDate: string;
  dominantHand?: string;
  dominantEye?: string;
  dominantFoot?: string;
  knownTraits?: string;
  parentSignals?: string;
  createdAt: string;
  updatedAt: string;
}

const collectionName = "children";

export async function listChildren() {
  const db = await getDatabase();
  const children = await db.collection(collectionName).find({}).sort({ name: 1 }).toArray();
  return children.map(toJsonId);
}

export async function getChildById(id: ObjectId) {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id });
  return child ? toJsonId(child) : null;
}

export async function upsertChild(profile: Omit<ChildProfile, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  
  // Try to find existing child by name and birthDate to avoid duplicates
  const existing = await db.collection(collectionName).findOne({ 
    name: profile.name, 
    birthDate: profile.birthDate 
  });

  if (existing) {
    await db.collection(collectionName).updateOne(
      { _id: existing._id },
      { $set: { ...profile, updatedAt: now } }
    );
    return toJsonId({ ...existing, ...profile, updatedAt: now });
  }

  const newChild = { ...profile, createdAt: now, updatedAt: now };
  const result = await db.collection(collectionName).insertOne(newChild);
  return { ...newChild, _id: result.insertedId.toString() };
}
