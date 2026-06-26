import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_REFLECTION_CAPABILITY_KEY, reflectionVisibilities } from "@/lib/athleteiq-reflection";
import { getReflectionForAccess, setReflectionVisibility } from "@/services/athleteiq-reflection.service";
import type { ReflectionVisibility } from "@/types/athleteiq-reflection";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const body = (await readJson(request)) as { visibility?: string } | null;
    const visibility = typeof body?.visibility === "string" ? body.visibility.trim() : "";
    if (!reflectionVisibilities.includes(visibility as ReflectionVisibility)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: [`visibility must be one of ${reflectionVisibilities.join(", ")}`] });
    const existing = await getReflectionForAccess(id);
    if (!existing) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["reflection not found"] });
    if (!(await canAccessAthlete(user, existing.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const reflection = await setReflectionVisibility({ entryId: id, visibility: visibility as ReflectionVisibility, actorEmail: user.email });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_REFLECTION_CAPABILITY_KEY, event: "athleteiq.reflection.visibility_updated", correlationId, athleteId: existing.athleteId, reflectionId: id, visibility, privacyClassification: "reflection_visibility", latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ reflection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
