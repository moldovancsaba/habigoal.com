import { evaluatePainSafety, getPainSignalFromCheckIn } from "@/lib/athleteiq-pain-safety";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { listAthleteIqCheckInSnapshots } from "@/repositories/athleteiq-check-in.repository";
import { listPainAlertsByAthlete, upsertPainAlert } from "@/repositories/athleteiq-pain-safety.repository";

export async function getPainGuardrailToday(input: {
  athleteId: string;
  timezone?: string;
  localDate?: string;
}) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const recent = await listAthleteIqCheckInSnapshots({
    athleteId: input.athleteId,
    from: shiftDate(localDate, -2),
    to: localDate
  });
  const evaluation = evaluatePainSafety({
    athleteId: input.athleteId,
    localDate,
    recentPainScores: recent.map(getPainSignalFromCheckIn)
  });

  if (!evaluation.alert) return evaluation.guardrail;
  const alert = await upsertPainAlert(evaluation.alert);
  return { ...evaluation.guardrail, coachAlertId: alert.id };
}

export async function listPainAlerts(input: {
  athleteId: string;
  timezone?: string;
  localDate?: string;
}) {
  await getPainGuardrailToday(input);
  return listPainAlertsByAthlete(input.athleteId);
}

function shiftDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
