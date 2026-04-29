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
    if (!user.email) {
      return jsonError("User email is required", 400, "VALIDATION_ERROR");
    }
    await upsertUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(request: Request) {
  const authError = requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return jsonError("User email is required", 400, "VALIDATION_ERROR");
    }
    const { deleteUserByEmail } = await import("@/repositories/user.repository");
    await deleteUserByEmail(email);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
