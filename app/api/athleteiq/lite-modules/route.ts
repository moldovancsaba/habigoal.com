import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_LITE_GATEWAY_CAPABILITY_KEY, listLiteModuleCapabilities, validateLiteGatewayRegistryCoverage } from "@/lib/athleteiq-lite-modules";
import { getLiteModuleDailySummary } from "@/services/athleteiq-lite-modules.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const registry = validateLiteGatewayRegistryCoverage();
    if (!registry.ok) return athleteIqJsonError("REGISTRY_INVALID", 500, correlationId, { details: registry.missing });
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const localDate = searchParams.get("localDate")?.trim();
    if (athleteId && !(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const summary = athleteId && localDate ? await getLiteModuleDailySummary({ athleteId, localDate }) : null;
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_LITE_GATEWAY_CAPABILITY_KEY, event: "athleteiq.lite_modules.viewed", correlationId, athleteId, hasSummary: Boolean(summary), latencyMs: Date.now() - startedAt }));
    return NextResponse.json({
      capabilities: listLiteModuleCapabilities(),
      summary,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    if ((error as Error).message === "LITE_GATEWAY_TIMEOUT") return athleteIqJsonError("TIMEOUT", 504, correlationId, { retryable: true });
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
