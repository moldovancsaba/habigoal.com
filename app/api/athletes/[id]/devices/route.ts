import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { env, requireServerEnv } from "@/config/env";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { buildOuraAuthorizeUrl, isOuraOAuthConfigured } from "@/lib/oura-oauth";
import { createWearableState, WEARABLE_OAUTH_STATE_COOKIE, WEARABLE_OAUTH_STATE_TTL_MS } from "@/lib/wearable-oauth-state";
import { findConnectionsByAthleteId } from "@/repositories/device-connection.repository";

function localeFromReferer(request: NextRequest): string {
  const referer = request.headers.get("referer");
  if (!referer) return "en";
  try {
    const segment = new URL(referer).pathname.split("/").filter(Boolean)[0];
    return /^[a-z]{2}$/.test(segment ?? "") ? segment : "en";
  } catch {
    return "en";
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const user = await getAuthUser();
    if (user && !(await canAccessAthlete(user, athleteId))) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const connections = await findConnectionsByAthleteId(athleteId);
    const safeConnections = connections.map((conn) => {
      // Strip secrets from reads.
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
    const user = await getAuthUser();
    if (user && !(await canAccessAthlete(user, athleteId))) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { source } = await request.json();
    if (source !== "oura" && source !== "garmin" && source !== "whoop") {
      return NextResponse.json({ error: "Unsupported wearable source" }, { status: 400 });
    }

    // Only Oura has a live connect leg today (see #347). Garmin/Whoop are
    // separate provider issues; report an empty authUrl honestly.
    if (source !== "oura" || !isOuraOAuthConfigured()) {
      return NextResponse.json({ authUrl: "", configured: false }, { status: 200 });
    }

    const base = env.appBaseUrl || request.nextUrl.origin;
    const redirectUri = `${base}/api/oauth/wearable/callback`;
    const state = createWearableState(
      { athleteId, provider: "oura", locale: localeFromReferer(request), nonce: randomUUID() },
      requireServerEnv("authSecret")
    );
    const authUrl = buildOuraAuthorizeUrl({ redirectUri, state });

    const response = NextResponse.json({ authUrl, configured: true }, { status: 200 });
    response.cookies.set(WEARABLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(WEARABLE_OAUTH_STATE_TTL_MS / 1000)
    });
    return response;
  } catch (error: unknown) {
    console.error("Error initiating device connection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
