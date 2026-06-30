import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/api";
import { getActiveBlueprints } from "@/lib/session-blueprints";

// Reusable session blueprints (TRN-002, #83). Static reference data readable by
// any authenticated persona — athletes execute them, trainers assign them.
export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    return NextResponse.json({ blueprints: getActiveBlueprints() });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
