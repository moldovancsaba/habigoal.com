import { ObjectId } from "mongodb";
import { getChildById, deleteChildById } from "@/repositories/child.repository";
import { listAssessmentsByChildId, deleteAssessmentsForChild } from "@/repositories/assessment.repository";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { findConnectionsByAthleteId } from "@/repositories/device-connection.repository";
import { getDatabase } from "@/lib/mongodb";

export interface AthleteExportBundle {
  exportedAt: string;
  athleteId: string;
  profile: unknown;
  assessments: unknown[];
  twin: unknown;
  deviceConnections: unknown[];
  consents: unknown[];
}

export async function exportAthleteData(athleteId: string): Promise<AthleteExportBundle> {
  const objectId = ObjectId.isValid(athleteId) ? new ObjectId(athleteId) : null;
  const profile = objectId ? await getChildById(objectId) : null;
  const assessments = await listAssessmentsByChildId(athleteId);
  const twin = await findTwinByAthleteId(athleteId);
  const deviceConnections = await findConnectionsByAthleteId(athleteId);
  const db = await getDatabase();
  const consents = await db.collection("consents").find({ athleteId }).toArray();

  return {
    exportedAt: new Date().toISOString(),
    athleteId,
    profile,
    assessments,
    twin,
    deviceConnections: deviceConnections.map(({ accessToken, refreshToken, ...safe }) => safe),
    consents,
  };
}

export async function eraseAthleteData(athleteId: string): Promise<{ erased: string[] }> {
  const objectId = ObjectId.isValid(athleteId) ? new ObjectId(athleteId) : null;
  const erased: string[] = [];
  const db = await getDatabase();

  const child = objectId ? await getChildById(objectId) : null;
  if (child && objectId) {
    await deleteAssessmentsForChild(athleteId, { name: child.name, birthDate: child.birthDate });
    erased.push("assessments");
    await deleteChildById(objectId);
    erased.push("profile");
  }

  await db.collection("athlete_twins").deleteMany({ athleteId });
  erased.push("twin");
  await db.collection("device_connections").deleteMany({ athleteId });
  erased.push("devices");
  await db.collection("consents").deleteMany({ athleteId });
  erased.push("consents");
  await db.collection("canonical_metrics").deleteMany({ athleteId });
  erased.push("metrics");
  await db.collection("coach_actions").deleteMany({ athleteKey: athleteId });
  erased.push("coach_actions");

  return { erased };
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
