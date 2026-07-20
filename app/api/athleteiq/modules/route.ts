import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CAPABILITY_KEY, ATHLETEIQ_MODULE_REGISTRY_VERSION, resolveAthleteIqModulesForUser, validateAthleteIqModuleRegistry } from "@/lib/athleteiq-modules";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const validation = validateAthleteIqModuleRegistry();
    if (!validation.ok) {
      return athleteIqJsonError("REGISTRY_INVALID", 500, correlationId, { details: validation.errors });
    }

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    if (athleteId && !(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_CAPABILITY_KEY, event: "aiq.modules.authorization_denied", correlationId, registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const result = resolveAthleteIqModulesForUser(user, {
      role: searchParams.get("role"),
      includeFuture: searchParams.get("includeFuture") === "true"
    });

    if (result.deniedReason) {
      console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CAPABILITY_KEY, event: "aiq.modules.empty_authorized_set", reason: result.deniedReason, correlationId, registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION }));
    }

    return NextResponse.json({
      ...result,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
