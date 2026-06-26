import { buildMentalEdgeSnapshot } from "@/lib/athleteiq-mental-edge";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { listAthleteIqCheckInSnapshots } from "@/repositories/athleteiq-check-in.repository";
import { listCompletedMentalEdgeRoutineIds, upsertMentalEdgeRoutineCompletion } from "@/repositories/athleteiq-mental-edge.repository";
import type { CoachMentalAlert, MentalEdgeRoutineId } from "@/types/athleteiq-mental-edge";

export async function getMentalEdgeToday(input: {
  athleteId: string;
  timezone?: string;
  localDate?: string;
}) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const from = shiftDate(localDate, -2);
  const [recent, completedRoutineIds] = await Promise.all([
    listAthleteIqCheckInSnapshots({ athleteId: input.athleteId, from, to: localDate }),
    listCompletedMentalEdgeRoutineIds({ athleteId: input.athleteId, localDate })
  ]);
  const today = recent.find((snapshot) => snapshot.localDate === localDate) ?? null;

  return buildMentalEdgeSnapshot({
    athleteId: input.athleteId,
    localDate,
    timezone,
    today,
    recent,
    completedRoutineIds
  });
}

export async function completeMentalEdgeRoutine(input: {
  athleteId: string;
  routineId: MentalEdgeRoutineId;
  localDate?: string;
  timezone?: string;
  actorEmail: string;
}) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  return upsertMentalEdgeRoutineCompletion({
    athleteId: input.athleteId,
    routineId: input.routineId,
    localDate,
    completedAt: new Date().toISOString(),
    actorEmail: input.actorEmail
  });
}

export async function getCoachMentalAlerts(input: {
  athleteIds: string[];
  timezone?: string;
  localDate?: string;
}) {
  const alerts: CoachMentalAlert[] = [];
  for (const athleteId of input.athleteIds) {
    const snapshot = await getMentalEdgeToday({ athleteId, timezone: input.timezone, localDate: input.localDate });
    if (snapshot.alertCandidate) alerts.push(snapshot.alertCandidate);
  }
  return alerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.athleteId.localeCompare(b.athleteId));
}

function shiftDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function severityRank(severity: CoachMentalAlert["severity"]) {
  return severity === "high" ? 2 : 1;
}
