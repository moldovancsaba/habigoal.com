import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";

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

    return NextResponse.json({
      accepted: true,
      event,
      userEmail: authUser.email
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
