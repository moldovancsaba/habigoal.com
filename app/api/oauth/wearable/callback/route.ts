import { NextRequest, NextResponse } from "next/server";
import { upsertDeviceConnection } from "@/repositories/device-connection.repository";
import { encryptToken } from "@/lib/wearable-token-crypto";
import { MetricSource } from "@/types/canonical-metric";
import crypto from "crypto";

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

    // Mock exchange code for tokens
    // const tokens = await vendorExchange(code);
    const tokens = {
      access_token: "mock_access_token_from_vendor",
      refresh_token: "mock_refresh_token_from_vendor",
      expires_in: 86400,
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();

    const connectionId = crypto.randomUUID();

    await upsertDeviceConnection({
      connectionId,
      athleteId,
      organisationId: "default",
      source: source as MetricSource,
      status: "active",
      externalUserId: "mock_external_user_123", // fetched from vendor profile
      scopes: ["daily.sleep", "daily.readiness"],
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: expiresAt,
      syncIntervalHours: 24,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // Redirect back to app settings page
    return NextResponse.redirect(new URL(`/?connected=${source}`, request.url));
  } catch (error: unknown) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
