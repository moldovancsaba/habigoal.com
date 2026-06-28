import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { env, requireServerEnv } from "@/config/env";
import { encryptToken } from "@/lib/wearable-token-crypto";
import { computeExpiryIso, getWearableOAuthProvider } from "@/lib/wearable-oauth-providers";
import { verifyWearableState, WEARABLE_OAUTH_STATE_COOKIE } from "@/lib/wearable-oauth-state";
import type { MetricSource } from "@/types/canonical-metric";
import { findConnectionByAthleteAndSource, upsertDeviceConnection } from "@/repositories/device-connection.repository";

function logEvent(event: string, fields: Record<string, unknown>) {
  // Never logs tokens or the authorization code.
  console.info(JSON.stringify({ event, ...fields }));
}

function redirectResult(base: string, locale: string, query: string, cookieClear = true): NextResponse {
  const url = `${base}/${locale}/dashboard/wearables?${query}`;
  const response = NextResponse.redirect(url, 302);
  if (cookieClear) response.cookies.set(WEARABLE_OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const base = env.appBaseUrl || request.nextUrl.origin;

  try {
    const sp = request.nextUrl.searchParams;
    const providerError = sp.get("error");
    const code = sp.get("code");
    const stateQuery = sp.get("state");

    // Resolve the binding from the single-use, signed state cookie (double-submit
    // with the `state` query param).
    const secret = requireServerEnv("authSecret");
    const cookieState = request.cookies.get(WEARABLE_OAUTH_STATE_COOKIE)?.value;
    const binding = verifyWearableState(cookieState, secret);
    const locale = binding?.locale || "en";

    if (providerError) {
      logEvent("wearable.oauth.exchange.failed", { correlationId, provider: binding?.provider, reason: "consent_denied" });
      return redirectResult(base, locale, "error=consent_denied");
    }

    if (!code || !stateQuery) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (!binding || stateQuery !== cookieState) {
      logEvent("wearable.oauth.exchange.failed", { correlationId, reason: "invalid_state" });
      return NextResponse.json({ error: "Invalid or expired state" }, { status: 403 });
    }

    // Dispatch on the provider carried in the signed state.
    const oauth = getWearableOAuthProvider(binding.provider);
    if (!oauth || !oauth.isConfigured()) {
      return NextResponse.json({ error: "Wearable OAuth is not configured for this provider." }, { status: 501 });
    }

    logEvent("wearable.oauth.exchange.started", { correlationId, provider: binding.provider, athleteId: binding.athleteId });

    const redirectUri = `${base}/api/oauth/wearable/callback`;
    let tokens;
    try {
      tokens = await oauth.exchangeAuthCode(code, redirectUri, binding.codeVerifier);
    } catch (error) {
      logEvent("wearable.oauth.exchange.failed", { correlationId, provider: binding.provider, reason: (error as Error).message });
      return redirectResult(base, locale, "error=exchange_failed");
    }

    const source = binding.provider as MetricSource;
    const existing = await findConnectionByAthleteAndSource(binding.athleteId, source);
    const nowIso = new Date().toISOString();
    await upsertDeviceConnection({
      connectionId: existing?.connectionId ?? randomUUID(),
      athleteId: binding.athleteId,
      organisationId: existing?.organisationId ?? "default",
      source,
      status: "active",
      externalUserId: existing?.externalUserId ?? "",
      scopes: tokens.scope ? tokens.scope.split(" ").filter(Boolean) : [],
      accessToken: encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
      tokenExpiresAt: computeExpiryIso(tokens.expires_in),
      lastSyncStatus: existing?.lastSyncStatus ?? "never",
      syncIntervalHours: existing?.syncIntervalHours ?? 12,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso
    });

    logEvent("wearable.oauth.exchange.succeeded", { correlationId, provider: binding.provider, athleteId: binding.athleteId });
    return redirectResult(base, locale, `connected=${binding.provider}`);
  } catch (error) {
    logEvent("wearable.oauth.exchange.failed", { correlationId, reason: "internal_error", detail: (error as Error).message });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
