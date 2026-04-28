import { NextResponse } from "next/server";
import { listChildren, upsertChild } from "@/repositories/child.repository";
import { syncChildrenFromAssessments } from "@/lib/sync-children";

export async function GET() {
  try {
    let children = await listChildren();
    if (children.length === 0) {
      await syncChildrenFromAssessments();
      children = await listChildren();
    }
    return NextResponse.json(children);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const child = await upsertChild(body);
    return NextResponse.json(child);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
