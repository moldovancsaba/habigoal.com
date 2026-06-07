import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/api";
import { getFormRegistrySnapshot } from "@/lib/form-registry";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    return NextResponse.json(getFormRegistrySnapshot(), {
      headers: {
        "Cache-Control": "no-store",
        "X-Habigoal-Registry": "form-registry"
      }
    });
  } catch (error) {
    return jsonError((error as Error).message, 500, "FORM_REGISTRY_READ_FAILED");
  }
}
