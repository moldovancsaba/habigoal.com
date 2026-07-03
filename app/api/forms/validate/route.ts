import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getFormContract, validateContract, isValidationOk } from "@/lib/forms/validation";

// Debug / CI validation endpoint (GH-153). Resolves a named form contract and runs
// the shared validation gateway, so client and server provably agree on what a
// valid payload is. Read-only — performs no writes.
export async function POST(request: Request) {
  const body = (await readJson(request)) as { form?: unknown; payload?: unknown } | null;
  const form = typeof body?.form === "string" ? body.form : "";
  if (!form) return jsonError("Missing form id", 400, "VALIDATION_ERROR");

  const contract = getFormContract(form);
  if (!contract) return jsonError(`Unknown form: ${form}`, 400, "UNKNOWN_FORM");

  const payload = (body?.payload ?? {}) as Record<string, unknown>;
  const errors = validateContract(contract, payload);

  return NextResponse.json({ ok: isValidationOk(errors), errors });
}
