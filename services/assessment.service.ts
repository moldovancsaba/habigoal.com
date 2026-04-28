import { computeAssessment } from "@/lib/scoring";
import { parseAssessmentPayload } from "@/lib/validations";
import { createAssessment, deleteAssessmentById, getAssessmentById, listAssessmentSummaries, updateAssessmentById } from "@/repositories/assessment.repository";
import { upsertChild } from "@/repositories/child.repository";
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

export async function createAssessmentFromPayload(input: unknown) {
  const payload = parseAssessmentPayload(input);
  const now = new Date().toISOString();
  
  // Centralize child profile
  const child = await upsertChild({
    name: payload.child.name,
    birthDate: payload.child.birthDate,
    knownTraits: payload.child.knownTraits,
    parentSignals: payload.child.parentSignals,
    dominantHand: payload.child.dominantHand,
    dominantEye: payload.child.dominantEye,
    dominantFoot: payload.child.dominantFoot
  });

  return createAssessment({
    ...payload,
    childId: child._id,
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
  
  // Sync child profile
  const child = await upsertChild({
    name: payload.child.name,
    birthDate: payload.child.birthDate,
    knownTraits: payload.child.knownTraits,
    parentSignals: payload.child.parentSignals,
    dominantHand: payload.child.dominantHand,
    dominantEye: payload.child.dominantEye,
    dominantFoot: payload.child.dominantFoot
  });

  return updateAssessmentById(id, {
    ...payload,
    childId: child._id,
    computed: computeAssessment(payload),
    updatedAt: new Date().toISOString()
  });
}

export async function removeAssessment(id: ObjectId) {
  await deleteAssessmentById(id);
}
