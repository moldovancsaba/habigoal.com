import { ObjectId } from "mongodb";
import { getChildById, deleteChildById } from "@/repositories/child.repository";
import { listAssessmentsByChildId } from "@/repositories/assessment.repository";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { findConnectionsByAthleteId } from "@/repositories/device-connection.repository";
import { listMediaByAthlete } from "@/repositories/media-asset.repository";
import { deleteAthleteMediaObjects } from "@/lib/media-storage";
import { getDatabase } from "@/lib/mongodb";
import { ATHLETE_PII_COLLECTIONS } from "@/lib/athlete-pii-registry";

export interface AthleteExportBundle {
  exportedAt: string;
  athleteId: string;
  profile: unknown;
  assessments: unknown[];
  twin: unknown;
  deviceConnections: unknown[];
  consents: unknown[];
  // Every other athlete-PII collection (registry-driven), token-stripped.
  records: Record<string, unknown[]>;
}

const TOKEN_FIELDS = ["accessToken", "refreshToken", "accessTokenEnc", "refreshTokenEnc"];

function stripTokens(doc: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...doc };
  for (const field of TOKEN_FIELDS) delete copy[field];
  return copy;
}

export async function exportAthleteData(athleteId: string): Promise<AthleteExportBundle> {
  const objectId = ObjectId.isValid(athleteId) ? new ObjectId(athleteId) : null;
  const db = await getDatabase();

  const profile = objectId ? await getChildById(objectId) : null;
  const assessments = await listAssessmentsByChildId(athleteId);
  const twin = await findTwinByAthleteId(athleteId);
  const deviceConnections = await findConnectionsByAthleteId(athleteId);
  const consents = await db.collection("consents").find({ athleteId }).toArray();

  // Registry-driven completeness: every athlete-PII collection appears in the export.
  const records: Record<string, unknown[]> = {};
  for (const entry of ATHLETE_PII_COLLECTIONS) {
    const rows = (await db.collection(entry.collection).find({ [entry.keyField]: athleteId }).toArray()) as Record<string, unknown>[];
    records[entry.collection] = rows.map(stripTokens);
  }

  return {
    exportedAt: new Date().toISOString(),
    athleteId,
    profile,
    assessments,
    twin,
    deviceConnections: deviceConnections.map(({ accessToken, refreshToken, ...safe }) => safe),
    consents,
    records,
  };
}

export interface AthleteEraseReceipt {
  erased: string[];
  counts: Record<string, number>;
  mediaObjectsDeleted: number;
}

// GDPR right-to-erasure: hard-delete every athlete-PII document across the canonical
// registry (lib/athlete-pii-registry), plus the profile and assessments (which need
// ObjectId + legacy-identity handling), plus best-effort object-storage media removal.
// Idempotent: a second run deletes nothing and returns zero counts.
export async function eraseAthleteData(athleteId: string): Promise<AthleteEraseReceipt> {
  const objectId = ObjectId.isValid(athleteId) ? new ObjectId(athleteId) : null;
  const db = await getDatabase();
  const counts: Record<string, number> = {};

  // Object-storage media keys must be collected before the DB rows are removed.
  const mediaAssets = await listMediaByAthlete(athleteId).catch(() => []);
  const storageKeys = mediaAssets
    .map((asset) => (asset as { storageKey?: string }).storageKey)
    .filter((key): key is string => typeof key === "string");

  // Profile + assessments (special handling: ObjectId + legacy identity fallback).
  const child = objectId ? await getChildById(objectId) : null;
  const assessmentFilter = objectId ? { childId: { $in: [athleteId, objectId] } } : { childId: athleteId };
  const assessmentResult = await db.collection("assessments").deleteMany(assessmentFilter as Record<string, unknown>);
  counts.assessments = assessmentResult.deletedCount ?? 0;
  if (child?.name && child?.birthDate) {
    const legacy = await db.collection("assessments").deleteMany({
      childId: { $exists: false },
      "child.name": child.name,
      "child.birthDate": child.birthDate,
    });
    counts.assessments += legacy.deletedCount ?? 0;
  }
  if (child && objectId) {
    await deleteChildById(objectId);
    counts.children = 1;
  } else {
    counts.children = 0;
  }

  // Registry-driven erasure of every other athlete-PII collection.
  for (const entry of ATHLETE_PII_COLLECTIONS) {
    if (entry.strategy === "pull") {
      const result = await db.collection(entry.collection).updateMany(
        { [entry.keyField]: athleteId },
        { $pull: { [entry.keyField]: athleteId } } as Record<string, unknown>
      );
      counts[entry.collection] = result.modifiedCount ?? 0;
    } else {
      const result = await db.collection(entry.collection).deleteMany({ [entry.keyField]: athleteId });
      counts[entry.collection] = result.deletedCount ?? 0;
    }
  }

  // Best-effort object-storage cleanup (graceful no-op when storage unconfigured).
  const mediaObjectsDeleted = await deleteAthleteMediaObjects(athleteId, storageKeys).catch(() => 0);

  return {
    erased: Object.keys(counts),
    counts,
    mediaObjectsDeleted,
  };
}

export async function exportTeamReport(teamAthleteIds: string[]) {
  const bundles = await Promise.all(teamAthleteIds.map((id) => exportAthleteData(id)));
  return {
    generatedAt: new Date().toISOString(),
    athleteCount: bundles.length,
    athletes: bundles.map((b) => ({
      athleteId: b.athleteId,
      name: (b.profile as { name?: string })?.name,
      latestReadiness: (b.twin as { recovery?: { recoveryReadinessScore?: number } })?.recovery?.recoveryReadinessScore,
      assessmentCount: b.assessments.length,
    })),
  };
}
