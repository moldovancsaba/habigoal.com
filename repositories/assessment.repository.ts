import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AssessmentRecord } from "@/types/assessment";

const collectionName = "assessments";

export async function listAssessmentSummaries() {
  const db = await getDatabase();
  const assessments = await db
    .collection(collectionName)
    .find({}, {
      projection: {
        child: 1,
        session: 1,
        mode: 1,
        computed: 1,
        createdAt: 1,
        updatedAt: 1
      }
    })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  return assessments.map(toJsonId);
}

export async function createAssessment(record: Omit<AssessmentRecord, "_id">) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).insertOne(record);
  return { ...record, _id: result.insertedId.toString() };
}

export async function getAssessmentById(id: ObjectId) {
  const db = await getDatabase();
  const assessment = await db.collection(collectionName).findOne({ _id: id });
  return assessment ? toJsonId(assessment) : null;
}

export async function updateAssessmentById(id: ObjectId, update: Partial<AssessmentRecord>) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $set: update },
    { returnDocument: "after" }
  );

  return result ? toJsonId(result) : null;
}

export async function deleteAssessmentById(id: ObjectId) {
  const db = await getDatabase();
  await db.collection(collectionName).deleteOne({ _id: id });
}

export async function listAssessmentsByChildId(childId: string) {
  const db = await getDatabase();
  const objectId = ObjectId.isValid(childId) ? new ObjectId(childId) : null;
  let assessments = await db
    .collection(collectionName)
    .find(objectId ? { childId: { $in: [childId, objectId] } } : { childId })
    .sort({ createdAt: 1 })
    .toArray();

  // Backward compatibility: older records may not have childId set,
  // but they can still be linked by immutable identity fields.
  if (assessments.length === 0 && objectId) {
    const child = await db.collection("children").findOne({ _id: objectId });
    if (child?.name && child?.birthDate) {
      assessments = await db
        .collection(collectionName)
        .find({
          "child.name": child.name,
          "child.birthDate": child.birthDate
        })
        .sort({ createdAt: 1 })
        .toArray();
    }
  }

  return assessments.map(toJsonId);
}
