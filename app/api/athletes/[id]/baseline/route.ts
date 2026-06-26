import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { insertOnboardingEventOnce } from "@/repositories/onboarding.repository";
import { updateChildBaselineSetup } from "@/repositories/child.repository";

function stringValue(value: unknown, max = 500) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function stringList(value: unknown, maxItems = 14) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item, 120)).filter(Boolean).slice(0, maxItems)
    : [];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const authUser = await getAuthUser();
    if (!authUser || !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const body = (await readJson(request)) as Record<string, unknown> | null;
    const weeklyGoal = stringValue(body?.weeklyGoal);
    const preferredTrainingDays = stringList(body?.preferredTrainingDays);
    const supportPreferences = stringList(body?.supportPreferences);

    if (!weeklyGoal && preferredTrainingDays.length === 0 && supportPreferences.length === 0) {
      return jsonError("At least one baseline field is required", 400, "VALIDATION_ERROR");
    }

    const athlete = await updateChildBaselineSetup(new ObjectId(id), {
      weeklyGoal,
      preferredTrainingDays,
      supportPreferences
    });
    if (!athlete) return jsonError("Athlete not found", 404, "NOT_FOUND");

    await insertOnboardingEventOnce({
      userEmail: authUser.email,
      moduleId: "athlete-first-login-baseline",
      event: "completed",
      route: `/athletes/${id}`,
      stepId: "open-profile",
      idempotencyKey: `athlete-first-login-baseline:baseline:${id}`
    });

    return NextResponse.json({ athlete });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
