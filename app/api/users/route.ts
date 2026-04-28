import { NextResponse } from "next/server";
import { listAllUsers, upsertUser } from "@/repositories/user.repository";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { parseUserPayload } from "@/lib/validations";

export async function GET(request: Request) {
  const authError = requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const users = await listAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const user = parseUserPayload(await readJson(request));
    if (!user.name) {
      return jsonError("User name is required", 400, "VALIDATION_ERROR");
    }
    await upsertUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
