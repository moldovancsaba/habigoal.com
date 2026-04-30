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
  locale?: string;
  createdAt: string;
  updatedAt: string;
  // Metrics fields (populated via aggregation)
  latestLocation?: string;
  latestSki?: number;
  latestScores?: {
    movement: number;
    social: number;
    mental: number;
  };
}

const collectionName = "children";

export async function listChildren() {
  const db = await getDatabase();
  const children = await db.collection(collectionName).find({}).sort({ name: 1 }).toArray();
  return children.map(toJsonId);
}

export async function listChildrenWithMetrics(): Promise<ChildProfile[]> {
  const db = await getDatabase();
  const pipeline = [
    {
      $lookup: {
        from: "assessments",
        let: { childId: { $toString: "$_id" } },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $or: [
                  { $eq: ["$childId", "$$childId"] },
                  { 
                    $and: [
                      { $eq: ["$child.name", "$name"] },
                      { $eq: ["$child.birthDate", "$birthDate"] }
                    ]
                  }
                ] 
              } 
            } 
          },
          { $sort: { createdAt: -1 } as any },
          { $limit: 1 }
        ],
        as: "latestAssessment"
      }
    },
    {
      $addFields: {
        latestAssessment: { $arrayElemAt: ["$latestAssessment", 0] }
      }
    },
    {
      $addFields: {
        latestLocation: "$latestAssessment.session.location",
        latestSki: "$latestAssessment.computed.ski",
        latestScores: {
          movement: "$latestAssessment.computed.movementAverage",
          social: "$latestAssessment.computed.socialAverage",
          mental: "$latestAssessment.computed.mentalAverage"
        }
      }
    },
    { $sort: { name: 1 } as any }
  ];

  const children = await db.collection(collectionName).aggregate(pipeline).toArray();
  return children.map(toJsonId) as any;
}

export async function getChildById(id: ObjectId) {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id });
  return child ? toJsonId(child) : null;
}

export async function upsertChild(profile: Omit<ChildProfile, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  
  const name = profile.name.trim();
  
  // Try to find existing child by name and birthDate to avoid duplicates
  const existing = await db.collection(collectionName).findOne({ 
    name: name, 
    birthDate: profile.birthDate 
  });

  if (existing) {
    await db.collection(collectionName).updateOne(
      { _id: existing._id },
      { $set: { ...profile, updatedAt: now } }
    );
    return toJsonId({ ...existing, ...profile, updatedAt: now });
  }

  const newChild = { ...profile, name, createdAt: now, updatedAt: now };
  const result = await db.collection(collectionName).insertOne(newChild);
  return { ...newChild, _id: result.insertedId.toString() };
}

export async function updateChildById(
  id: ObjectId,
  profile: Omit<ChildProfile, "_id" | "createdAt" | "updatedAt">
) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const nextProfile = {
    ...profile,
    name: profile.name.trim(),
    updatedAt: now
  };

  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $set: nextProfile },
    { returnDocument: "after" }
  );

  return result ? toJsonId(result) : null;
}

export async function deleteChildById(id: ObjectId) {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id });
  if (!child) {
    return null;
  }

  await db.collection(collectionName).deleteOne({ _id: id });
  const jsonChild = toJsonId(child) as Record<string, unknown>;
  return {
    _id: typeof jsonChild._id === "string" ? jsonChild._id : undefined,
    name: typeof jsonChild.name === "string" ? jsonChild.name : "",
    birthDate: typeof jsonChild.birthDate === "string" ? jsonChild.birthDate : "",
    dominantHand: typeof jsonChild.dominantHand === "string" ? jsonChild.dominantHand : "",
    dominantEye: typeof jsonChild.dominantEye === "string" ? jsonChild.dominantEye : "",
    dominantFoot: typeof jsonChild.dominantFoot === "string" ? jsonChild.dominantFoot : "",
    knownTraits: typeof jsonChild.knownTraits === "string" ? jsonChild.knownTraits : "",
    parentSignals: typeof jsonChild.parentSignals === "string" ? jsonChild.parentSignals : "",
    createdAt: typeof jsonChild.createdAt === "string" ? jsonChild.createdAt : "",
    updatedAt: typeof jsonChild.updatedAt === "string" ? jsonChild.updatedAt : ""
  } satisfies ChildProfile;
}
