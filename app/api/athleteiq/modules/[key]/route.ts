import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CAPABILITY_KEY, ATHLETEIQ_MODULE_REGISTRY_VERSION, getAthleteIqModule, resolveAthleteIqModulesForUser, toAthleteIqModuleView, validateAthleteIqModuleRegistry } from "@/lib/athleteiq-modules";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const validation = validateAthleteIqModuleRegistry();
    if (!validation.ok) {
      return athleteIqJsonError("REGISTRY_INVALID", 500, correlationId, { details: validation.errors });
    }

    const { key } = await params;
    const definition = getAthleteIqModule(key);
    if (!definition) return athleteIqJsonError("MODULE_NOT_FOUND", 404, correlationId);

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    if (athleteId && !(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_CAPABILITY_KEY, event: "aiq.module.authorization_denied", moduleKey: key, correlationId, registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const includeFuture = searchParams.get("includeFuture") === "true";
    if (definition.maturity === "future" && !includeFuture) {
      return athleteIqJsonError("FUTURE_MODULE_NOT_ACTIONABLE", 409, correlationId);
    }

    const result = resolveAthleteIqModulesForUser(user, {
      role: searchParams.get("role"),
      includeFuture
    });
    const permitted = result.modules.some((candidate) => candidate.key === definition.key);
    if (!permitted) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    return NextResponse.json({
      registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
      capabilityKey: ATHLETEIQ_CAPABILITY_KEY,
      role: result.role,
      module: toAthleteIqModuleView(definition),
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
