import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqHashForLog, athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_REFLECTION_CAPABILITY_KEY, validateReflectionInput } from "@/lib/athleteiq-reflection";
import { createReflection } from "@/services/athleteiq-reflection.service";
import type { ReflectionVisibility } from "@/types/athleteiq-reflection";

type ReflectionBody = {
  athleteId?: string;
  localDate?: string;
  body?: string;
  moodTag?: string;
  visibility?: string;
};

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as ReflectionBody | null;
    const input = {
      athleteId: typeof body?.athleteId === "string" ? body.athleteId.trim() : "",
      localDate: typeof body?.localDate === "string" ? body.localDate.trim() : "",
      body: typeof body?.body === "string" ? body.body.trim() : "",
      moodTag: typeof body?.moodTag === "string" ? body.moodTag.trim() : undefined,
      visibility: typeof body?.visibility === "string" ? body.visibility.trim() : undefined
    };
    const errors = validateReflectionInput(input);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    if (!(await canAccessAthlete(user, input.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const result = await createReflection({
      athleteId: input.athleteId,
      localDate: input.localDate,
      body: input.body,
      moodTag: input.moodTag,
      visibility: input.visibility as ReflectionVisibility | undefined
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_REFLECTION_CAPABILITY_KEY, event: result.skipped ? "athleteiq.reflection.skipped_blank" : "athleteiq.reflection.created", correlationId, athleteIdHash: athleteIqHashForLog(input.athleteId), reflectionId: result.reflection?.id, privacyClassification: "private_reflection", latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ ...result, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
