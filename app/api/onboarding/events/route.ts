import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { createDefaultOnboardingState } from "@/lib/onboarding/default-state";
import { applyOnboardingStatePatch } from "@/lib/onboarding/engine";
import { getOnboardingStateByEmail, upsertOnboardingState } from "@/repositories/onboarding-state.repository";

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return jsonError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const body = (await readJson(request)) as Record<string, unknown> | null;
    const event = typeof body?.event === "string" ? body.event.trim() : "";
    if (!event) {
      return jsonError("Event is required", 400, "VALIDATION_ERROR");
    }

    const patches = [];

    if (event === "athlete.checkin_saved") {
      patches.push(
        { action: "checklist-step", moduleId: "athlete-first-checkin", stepId: "save-checkin" } as const,
        { action: "complete", moduleId: "athlete-first-checkin" } as const
      );
    }

    if (event === "athlete.habit_saved") {
      patches.push(
        { action: "checklist-step", moduleId: "athlete-habit-tracker", stepId: "save-habits" } as const,
        { action: "complete", moduleId: "athlete-habit-tracker" } as const
      );
    }

    if (patches.length > 0) {
      let current = (await getOnboardingStateByEmail(authUser.email)) ?? createDefaultOnboardingState(authUser.email);
      for (const patch of patches) {
        current = applyOnboardingStatePatch(current, authUser.email, patch);
      }
      await upsertOnboardingState(current);
    }

    return NextResponse.json({
      accepted: true,
      event,
      userEmail: authUser.email
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
