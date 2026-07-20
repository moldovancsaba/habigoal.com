import { NextResponse } from "next/server";
import { listChildren, listChildrenWithMetrics, listDeletedChildren, upsertChild } from "@/repositories/child.repository";
import { syncChildrenFromAssessments } from "@/lib/sync-children";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser, resolveAccessibleAthleteIds } from "@/lib/access";
import { parseChildPayload } from "@/lib/validations";

export async function GET(request: Request) {
  // Parents are scoped down to their linked athletes below via
  // resolveAccessibleAthleteIds (parentAthleteIds); they may list those.
  const authError = await requireRole(request, ["admin", "trainer", "athlete", "parent"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get("metrics") === "true";
    const includeDeleted = searchParams.get("deleted") === "true";
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });

    if (includeDeleted) {
      if (authUser?.primaryRole === "athlete") {
        return NextResponse.json([]);
      }
      return NextResponse.json(await listDeletedChildren());
    }

    let children = includeMetrics ? await listChildrenWithMetrics() : await listChildren();
    
    if (children.length === 0) {
      await syncChildrenFromAssessments();
      children = includeMetrics ? await listChildrenWithMetrics() : await listChildren();
    }
    if (!authUser) {
      return NextResponse.json(children);
    }

    const allowedIds = await resolveAccessibleAthleteIds(authUser);
    return NextResponse.json(allowedIds === null ? children : children.filter((child) => child._id && allowedIds.includes(child._id)));
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
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
