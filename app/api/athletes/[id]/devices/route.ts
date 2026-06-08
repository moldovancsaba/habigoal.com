import { NextRequest, NextResponse } from "next/server";
import { findConnectionsByAthleteId } from "@/repositories/device-connection.repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    // Auth check here...

    const connections = await findConnectionsByAthleteId(athleteId);
    
    const safeConnections = connections.map((conn) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accessToken, refreshToken, ...safe } = conn;
      return safe;
    });

    return NextResponse.json({ data: safeConnections }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching device connections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const { source } = await request.json();
    
    // Ensure we support this source
    if (source !== "oura" && source !== "garmin" && source !== "whoop") {
      return NextResponse.json({ error: "Unsupported wearable source" }, { status: 400 });
    }

    // In a real app, generate a CSRF state token and store it temporarily
    const state = Buffer.from(JSON.stringify({ athleteId, source })).toString("base64");

    // Construct the OAuth URL (mocked here, should call connector.getAuthUrl)
    let authUrl = "";
    if (source === "oura") {
      const clientId = process.env.WEARABLE_OURA_CLIENT_ID;
      const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/wearable/callback?source=oura`;
      authUrl = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=daily.sleep daily.readiness heartrate`;
    }

    return NextResponse.json({ authUrl }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error initiating device connection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
