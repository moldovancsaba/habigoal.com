import { NextResponse } from "next/server";
import { listChildren, listChildrenWithMetrics, listDeletedChildren, upsertChild } from "@/repositories/child.repository";
import { syncChildrenFromAssessments } from "@/lib/sync-children";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { parseChildPayload } from "@/lib/validations";

export async function GET(request: Request) {
  const authError = requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get("metrics") === "true";
    const includeDeleted = searchParams.get("deleted") === "true";

    if (includeDeleted) {
      return NextResponse.json(await listDeletedChildren());
    }

    let children = includeMetrics ? await listChildrenWithMetrics() : await listChildren();
    
    if (children.length === 0) {
      await syncChildrenFromAssessments();
      children = includeMetrics ? await listChildrenWithMetrics() : await listChildren();
    }
    return NextResponse.json(children);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = requireRole(request, ["admin", "conductor"]);
  if (authError) return authError;

  try {
    const body = parseChildPayload(await readJson(request));
    if (!body.name || !body.birthDate) {
      return jsonError("Child name and birthDate are required", 400, "VALIDATION_ERROR");
    }
    const child = await upsertChild(body);
    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
