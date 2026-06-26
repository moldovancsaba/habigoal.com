import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { buildReadinessRouteSnapshot } from "@/lib/athleteiq-readiness-route";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getReadinessRouteSnapshot, upsertReadinessRouteSnapshot } from "@/repositories/athleteiq-readiness-route.repository";
import { getPainGuardrailToday } from "@/services/athleteiq-pain-safety.service";

export async function getReadinessRouteToday(input: { athleteId: string; timezone?: string; localDate?: string }) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const existing = await getReadinessRouteSnapshot({ athleteId: input.athleteId, localDate });
  if (existing) return existing;
  return recalculateReadinessRoute({ ...input, timezone, localDate });
}

export async function recalculateReadinessRoute(input: { athleteId: string; timezone?: string; localDate?: string }) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const [dailyIq, painGuardrail, previousSnapshot] = await Promise.all([
    getLatestDailyIqSnapshot({ athleteId: input.athleteId, localDate }),
    getPainGuardrailToday({ athleteId: input.athleteId, timezone, localDate }),
    getReadinessRouteSnapshot({ athleteId: input.athleteId, localDate })
  ]);
  const snapshot = buildReadinessRouteSnapshot({ athleteId: input.athleteId, localDate, timezone, dailyIq, painGuardrail, previousSnapshot });
  return upsertReadinessRouteSnapshot(snapshot);
}
