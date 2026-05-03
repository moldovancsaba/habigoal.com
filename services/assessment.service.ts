import { computeAssessment } from "@/lib/scoring";
import { parseAssessmentPayload } from "@/lib/validations";
import { createAssessment, deleteAssessmentById, getAssessmentById, listAssessmentSummaries, restoreAssessmentById, updateAssessmentById, listDeletedAssessmentSummaries } from "@/repositories/assessment.repository";
import { getChildById, updateChildById, upsertChild } from "@/repositories/child.repository";
import { getGlobalSettings } from "@/repositories/settings.repository";
import { ObjectId } from "mongodb";

export function parseObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function listAssessments() {
  if (!process.env.MONGODB_URI) {
    return { assessments: [], configured: false };
  }

  return { assessments: await listAssessmentSummaries(), configured: true };
}

export async function listDeletedAssessments() {
  if (!process.env.MONGODB_URI) {
    return { assessments: [], configured: false };
  }
  return { assessments: await listDeletedAssessmentSummaries(), configured: true };
}

export async function createAssessmentFromPayload(input: unknown) {
  const payload = parseAssessmentPayload(input);
  const now = new Date().toISOString();

  const childProfile = {
    name: payload.child.name,
    birthDate: payload.child.birthDate,
    knownTraits: payload.child.knownTraits,
    parentSignals: payload.child.parentSignals,
    dominantHand: payload.child.dominantHand,
    dominantEye: payload.child.dominantEye,
    dominantFoot: payload.child.dominantFoot
  };
  const childObjectId = payload.childId ? parseObjectId(payload.childId) : null;
  const existingChild = childObjectId ? await getChildById(childObjectId) : null;
  const updatedChild = existingChild && childObjectId ? await updateChildById(childObjectId, childProfile) : null;
  const child = updatedChild ?? (await upsertChild(childProfile));

  const settings = await getGlobalSettings();
  const standardsVersionUsed = settings?.standards?.activeVersion || "v1";

  return createAssessment({
    ...payload,
    childId: child._id,
    standardsVersionUsed,
    computed: computeAssessment(payload),
    createdAt: now,
    updatedAt: now
  });
}

export async function getAssessment(id: ObjectId) {
  return getAssessmentById(id);
}

export async function updateAssessmentFromPayload(id: ObjectId, input: unknown) {
  const payload = parseAssessmentPayload(input);

  const childProfile = {
    name: payload.child.name,
    birthDate: payload.child.birthDate,
    knownTraits: payload.child.knownTraits,
    parentSignals: payload.child.parentSignals,
    dominantHand: payload.child.dominantHand,
    dominantEye: payload.child.dominantEye,
    dominantFoot: payload.child.dominantFoot
  };
  const childObjectId = payload.childId ? parseObjectId(payload.childId) : null;
  const existingChild = childObjectId ? await getChildById(childObjectId) : null;
  const updatedChild = existingChild && childObjectId ? await updateChildById(childObjectId, childProfile) : null;
  const child = updatedChild ?? (await upsertChild(childProfile));

  const existing = await getAssessmentById(id);
  const updateHistory = existing?.updateHistory || [];
  const now = new Date().toISOString();
  
  const settings = await getGlobalSettings();
  const standardsVersionUsed = settings?.standards?.activeVersion || existing?.standardsVersionUsed || "v1";

  return updateAssessmentById(id, {
    ...payload,
    childId: child._id,
    standardsVersionUsed,
    computed: computeAssessment(payload),
    updatedAt: now,
    updateHistory: [...updateHistory, now]
  });
}

export async function removeAssessment(id: ObjectId) {
  await deleteAssessmentById(id);
}

export async function restoreAssessment(id: ObjectId) {
  await restoreAssessmentById(id);
}
