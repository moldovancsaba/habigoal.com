import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_PAIN_SAFETY_CAPABILITY_KEY } from "@/lib/athleteiq-pain-safety";
import { getPainAlertById, updatePainAlertState } from "@/repositories/athleteiq-pain-safety.repository";
import type { PainAlertState } from "@/types/athleteiq-pain-safety";

type PatchablePainAlertState = Extract<PainAlertState, "resolved" | "dismissed" | "monitor" | "coach_review">;
const allowedPatchStates = new Set<PatchablePainAlertState>(["resolved", "dismissed", "monitor", "coach_review"]);

function parsePatchState(value: unknown): PatchablePainAlertState | null {
  return typeof value === "string" && allowedPatchStates.has(value as PatchablePainAlertState) ? value as PatchablePainAlertState : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const body = (await readJson(request)) as { state?: PainAlertState; note?: string } | null;
    const state = parsePatchState(body?.state);
    if (!state) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["state must be resolved, dismissed, monitor, or coach_review"] });

    const existing = await getPainAlertById(id);
    if (!existing) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["pain alert not found"] });
    if (!(await canAccessAthlete(user, existing.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    if (state === "resolved" || state === "dismissed" || state === "coach_review") {
      const canMutate = ["admin", "trainer", "performance_coach", "physio"].includes(user.primaryRole);
      if (!canMutate) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const alert = await updatePainAlertState({
      id,
      state,
      actorEmail: user.email,
      note: typeof body?.note === "string" ? body.note.slice(0, 500).trim() : undefined
    });

    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_PAIN_SAFETY_CAPABILITY_KEY, event: "athleteiq.pain_alert.updated", correlationId, alertId: id, state, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({ alert, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
