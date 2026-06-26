import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_LITE_GATEWAY_CAPABILITY_KEY } from "@/lib/athleteiq-lite-modules";
import { createFuelLiteEntry } from "@/services/athleteiq-lite-modules.service";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (typeof body?.athleteId !== "string" || !(await canAccessAthlete(user, body.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    const result = await createFuelLiteEntry({ body, actorEmail: user.email, idempotencyKey: getIdempotencyKey(request, body) });
    if (result.errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_LITE_GATEWAY_CAPABILITY_KEY, event: "athleteiq.fuel_lite.entry_saved", correlationId, athleteId: body.athleteId, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ entry: result.entry, warnings: result.warnings, correlationId, latencyMs: Date.now() - startedAt });
  } catch (error) {
    if ((error as Error).message === "LITE_GATEWAY_TIMEOUT") return athleteIqJsonError("TIMEOUT", 504, correlationId, { retryable: true });
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function getIdempotencyKey(request: Request, body: Record<string, unknown> | null) {
  return request.headers.get("Idempotency-Key")?.trim() || (typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined);
}
