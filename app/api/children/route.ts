import { NextResponse } from "next/server";
import { listChildren, upsertChild } from "@/repositories/child.repository";

export async function GET() {
  try {
    return NextResponse.json(await listChildren());
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
