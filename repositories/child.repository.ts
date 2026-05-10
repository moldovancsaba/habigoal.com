import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";

export interface ChildProfile {
  _id?: string;
  surveyId?: string;
  name: string;
  birthDate: string;
  baselineProfile?: {
    heightCm?: number;
    weightKg?: number;
    wingspanCm?: number;
    restingHeartRate?: number;
    sleepTargetHours?: number;
    cognitiveScore?: number;
    confidenceBaseline?: number;
    focusBaseline?: number;
    motivationBaseline?: number;
    stressBaseline?: number;
    injuryNotes?: string;
    medicalNotes?: string;
    coachBaselineNotes?: string;
  };
  consentPhoto?: boolean;
  consentReport?: boolean;
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
  avgSki?: number;
  latestRecordId?: string;
  latestScores?: {
    movement: number;
    social: number;
    mental: number;
  };
  latestReadiness?: number;
  avgReadiness?: number;
  assessmentCount?: number;
}

const collectionName = "children";

function normalizeChildProfile(raw: Record<string, unknown>): ChildProfile {
  const baselineProfile =
    raw.baselineProfile && typeof raw.baselineProfile === "object"
      ? (raw.baselineProfile as ChildProfile["baselineProfile"])
      : undefined;

  return {
    ...(raw as unknown as ChildProfile),
    _id: typeof raw._id === "string" ? raw._id : undefined,
    baselineProfile,
    surveyId:
      typeof raw.surveyId === "string"
        ? raw.surveyId
        : typeof raw.kidexId === "string"
          ? raw.kidexId
          : undefined
  };
}

export async function listChildren() {
  const db = await getDatabase();
  const children = await db.collection(collectionName).find({ deletedAt: { $exists: false } }).sort({ name: 1 }).toArray();
  return children.map((child) => normalizeChildProfile(toJsonId(child) as Record<string, unknown>));
}

export async function listDeletedChildren() {
  const db = await getDatabase();
  const children = await db.collection(collectionName).find({ deletedAt: { $exists: true } }).sort({ updatedAt: -1 }).toArray();
  return children.map((child) => normalizeChildProfile(toJsonId(child) as Record<string, unknown>));
}

export async function listChildrenWithMetrics(): Promise<ChildProfile[]> {
  const db = await getDatabase();
  const pipeline = [
    { $match: { deletedAt: { $exists: false } } },
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
          {
            $group: {
              _id: null,
              avgSki: { $avg: "$computed.ski" },
              avgReadiness: { $avg: "$computed.ski" },
              assessmentCount: { $sum: 1 }
            }
          }
        ],
        as: "aggregateMetrics"
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
        latestRecordId: { $toString: "$latestAssessment._id" },
        latestScores: {
          movement: "$latestAssessment.computed.movementAverage",
          social: "$latestAssessment.computed.socialAverage",
          mental: "$latestAssessment.computed.mentalAverage"
        },
        latestReadiness: {
          $round: [
            {
              $min: [
                { $ifNull: ["$latestAssessment.computed.ski", 0] },
                5
              ]
            },
            2
          ]
        },
        avgReadiness: {
          $round: [
            {
              $min: [
                { $ifNull: [{ $arrayElemAt: ["$aggregateMetrics.avgReadiness", 0] }, 0] },
                5
              ]
            },
            2
          ]
        },
        assessmentCount: { $ifNull: [{ $arrayElemAt: ["$aggregateMetrics.assessmentCount", 0] }, 0] },
        avgSki: { $round: [{ $ifNull: [{ $arrayElemAt: ["$aggregateMetrics.avgSki", 0] }, 0] }, 2] }
      }
    },
    { $sort: { name: 1 } as any }
  ];

  const children = await db.collection(collectionName).aggregate(pipeline).toArray();
  return children.map((child) => normalizeChildProfile(toJsonId(child) as Record<string, unknown>));
}

export async function getChildById(id: ObjectId) {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id, deletedAt: { $exists: false } });
  return child ? normalizeChildProfile(toJsonId(child) as Record<string, unknown>) : null;
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
      { $set: { ...profile, updatedAt: now }, $unset: { kidexId: "" } }
    );
    return normalizeChildProfile(toJsonId({ ...existing, ...profile, updatedAt: now }) as Record<string, unknown>);
  }

  const newChild = {
    ...profile,
    surveyId: profile.surveyId || crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now
  };
  const result = await db.collection(collectionName).insertOne(newChild);
  return normalizeChildProfile({ ...newChild, _id: result.insertedId.toString() });
}

export async function updateChildById(
  id: ObjectId,
  profile: Omit<ChildProfile, "_id" | "createdAt" | "updatedAt">
) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const nextProfile = {
    ...profile,
    surveyId: profile.surveyId || crypto.randomUUID(),
    name: profile.name.trim(),
    updatedAt: now
  };

  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $set: nextProfile, $unset: { kidexId: "" } },
    { returnDocument: "after" }
  );

  return result ? normalizeChildProfile(toJsonId(result) as Record<string, unknown>) : null;
}

export async function deleteChildById(id: ObjectId) {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id });
  if (!child) {
    return null;
  }

  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne({ _id: id }, { $set: { deletedAt: now, updatedAt: now } });
  const jsonChild = toJsonId(child) as Record<string, unknown>;
  return {
    _id: typeof jsonChild._id === "string" ? jsonChild._id : undefined,
    surveyId:
      typeof jsonChild.surveyId === "string"
        ? jsonChild.surveyId
        : typeof jsonChild.kidexId === "string"
          ? jsonChild.kidexId
          : "",
    name: typeof jsonChild.name === "string" ? jsonChild.name : "",
    birthDate: typeof jsonChild.birthDate === "string" ? jsonChild.birthDate : "",
    baselineProfile:
      jsonChild.baselineProfile && typeof jsonChild.baselineProfile === "object"
        ? (jsonChild.baselineProfile as ChildProfile["baselineProfile"])
        : undefined,
    consentPhoto: Boolean(jsonChild.consentPhoto),
    consentReport: Boolean(jsonChild.consentReport),
    dominantHand: typeof jsonChild.dominantHand === "string" ? jsonChild.dominantHand : "",
    dominantEye: typeof jsonChild.dominantEye === "string" ? jsonChild.dominantEye : "",
    dominantFoot: typeof jsonChild.dominantFoot === "string" ? jsonChild.dominantFoot : "",
    knownTraits: typeof jsonChild.knownTraits === "string" ? jsonChild.knownTraits : "",
    parentSignals: typeof jsonChild.parentSignals === "string" ? jsonChild.parentSignals : "",
    createdAt: typeof jsonChild.createdAt === "string" ? jsonChild.createdAt : "",
    updatedAt: typeof jsonChild.updatedAt === "string" ? jsonChild.updatedAt : ""
  } satisfies ChildProfile;
}

export async function restoreChildById(id: ObjectId) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $unset: { deletedAt: "" }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  return result ? normalizeChildProfile(toJsonId(result) as Record<string, unknown>) : null;
}
