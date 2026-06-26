import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await request.json().catch(() => null);

    return NextResponse.json({
      error: "VALD webhook ingestion is not configured for live signature validation and canonical metric persistence."
    }, { status: 501 });
  } catch {
    return NextResponse.json({ error: "Webhook ingestion failed" }, { status: 500 });
  }
}
