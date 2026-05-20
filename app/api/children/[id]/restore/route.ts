import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/api";
import { restoreChildById } from "@/repositories/child.repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const child = await restoreChildById(new ObjectId(id));
    if (!child) return jsonError("Athlete not found", 404, "NOT_FOUND");
    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
