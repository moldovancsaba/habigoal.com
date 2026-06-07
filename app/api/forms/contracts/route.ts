import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/api";
import { compileFormContracts } from "@/lib/forms/compiler";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const result = compileFormContracts();
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-Habigoal-Registry": "form-contracts"
      }
    });
  } catch (error) {
    return jsonError((error as Error).message, 500, "FORM_CONTRACT_COMPILE_FAILED");
  }
}
