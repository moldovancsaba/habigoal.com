import { NextResponse } from "next/server";
import { listAllUsers, upsertUser } from "@/repositories/user.repository";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { parseUserPayload } from "@/lib/validations";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const users = await listAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const user = parseUserPayload(await readJson(request));
    if (!user.email) {
      return jsonError("User email is required", 400, "VALIDATION_ERROR");
    }

    if (user.roles.length === 0) {
      return jsonError("At least one role is required", 400, "VALIDATION_ERROR");
    }

    const session = await getSession();
    const { findUserByEmail } = await import("@/repositories/user.repository");
    const [users, existingUser] = await Promise.all([listAllUsers(), findUserByEmail(user.email)]);
    const adminCount = users.filter((entry) => entry.roles.includes("admin")).length;
    const isRemovingAdmin = existingUser?.roles.includes("admin") && !user.roles.includes("admin");

    if (isRemovingAdmin && adminCount <= 1) {
      return jsonError("You cannot remove the last admin", 400, "VALIDATION_ERROR");
    }

    if (session?.email?.toLowerCase().trim() === user.email && !user.roles.includes("admin")) {
      return jsonError("You cannot remove your own admin access", 400, "VALIDATION_ERROR");
    }

    await upsertUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return jsonError("User email is required", 400, "VALIDATION_ERROR");
    }
    const session = await getSession();
    const normalizedEmail = email.toLowerCase().trim();
    if (session?.email?.toLowerCase().trim() === normalizedEmail) {
      return jsonError("You cannot remove your own access", 400, "VALIDATION_ERROR");
    }

    const { deleteUserByEmail, findUserByEmail } = await import("@/repositories/user.repository");
    const [users, targetUser] = await Promise.all([listAllUsers(), findUserByEmail(normalizedEmail)]);
    const adminCount = users.filter((user) => user.roles.includes("admin")).length;
    if (targetUser?.roles.includes("admin") && adminCount <= 1) {
      return jsonError("You cannot remove the last admin", 400, "VALIDATION_ERROR");
    }
    await deleteUserByEmail(normalizedEmail);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
