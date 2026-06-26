import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!source || !code || !state) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // In a real app, validate the state token matches what we issued
    let statePayload;
    try {
      statePayload = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    } catch {
      return NextResponse.json({ error: "Invalid state token" }, { status: 400 });
    }

    const athleteId = statePayload.athleteId;
    if (typeof athleteId !== "string" || !athleteId.trim()) {
      return NextResponse.json({ error: "Invalid state token" }, { status: 400 });
    }

    return NextResponse.json({
      error: "Wearable OAuth is not configured for live provider exchange.",
      source,
      athleteId
    }, { status: 501 });
  } catch (error: unknown) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
