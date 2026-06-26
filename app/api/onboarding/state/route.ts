import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { jsonError } from "@/lib/api";
import { resolveOnboardingModules } from "@/lib/onboarding";
import { listOnboardingEventsByUser } from "@/repositories/onboarding.repository";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Authentication required", 401, "AUTH_REQUIRED");

  try {
    const { searchParams } = new URL(request.url);
    const route = searchParams.get("route") || "/";
    const events = await listOnboardingEventsByUser(user.email);
    return NextResponse.json({
      modules: resolveOnboardingModules(user, route, events)
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
