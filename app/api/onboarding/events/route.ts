import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { jsonError, readJson } from "@/lib/api";
import { ONBOARDING_MODULES, canAccessOnboardingModule, isOnboardingEventType, resolveOnboardingModules } from "@/lib/onboarding";
import { insertOnboardingEventOnce, listOnboardingEventsByUser } from "@/repositories/onboarding.repository";

function stringValue(value: unknown, max = 240) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Authentication required", 401, "AUTH_REQUIRED");

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const moduleId = stringValue(body?.moduleId);
    const route = stringValue(body?.route, 500) || "/";
    const event = body?.event;
    const stepId = stringValue(body?.stepId);
    const idempotencyKey = stringValue(body?.idempotencyKey, 120);

    if (!moduleId || !isOnboardingEventType(event)) {
      return jsonError("Invalid onboarding event payload", 400, "INVALID_PAYLOAD");
    }

    const moduleDefinition = ONBOARDING_MODULES.find((candidate) => candidate.id === moduleId);
    if (!moduleDefinition || !canAccessOnboardingModule(user, moduleDefinition, route)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const record = await insertOnboardingEventOnce({
      userEmail: user.email,
      moduleId,
      event,
      route,
      ...(stepId ? { stepId } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {})
    });
    const events = await listOnboardingEventsByUser(user.email);
    return NextResponse.json({
      event: record,
      modules: resolveOnboardingModules(user, route, events)
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
