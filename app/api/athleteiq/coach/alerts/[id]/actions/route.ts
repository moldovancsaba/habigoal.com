import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY, stakeholderActionStates } from "@/lib/athleteiq-stakeholder";
import { recordStakeholderAlertAction } from "@/services/athleteiq-stakeholder.service";
import type { StakeholderActionState } from "@/types/athleteiq-stakeholder";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const body = (await readJson(request)) as { athleteId?: string; date?: string; status?: string; detail?: string } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    const localDate = typeof body?.date === "string" ? body.date.trim() : "";
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["date must use YYYY-MM-DD"] });
    if (!stakeholderActionStates.includes(status as StakeholderActionState)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: [`status must be one of ${stakeholderActionStates.join(", ")}`] });
    if (!["admin", "trainer", "performance_coach", "physio"].includes(user.primaryRole)) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const action = await recordStakeholderAlertAction({
      alertId: id,
      athleteId,
      localDate,
      status: status as StakeholderActionState,
      detail: typeof body?.detail === "string" ? body.detail.trim() : undefined,
      user
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY, event: "athleteiq.coach.alert_action_recorded", correlationId, alertId: id, athleteId, status, privacyClassification: "coach_action", latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ action, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
