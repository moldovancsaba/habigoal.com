import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { normalizeValdEvent, rawPayloadFromVald, verifyValdSignature, type ValdEvent } from "@/lib/vald-webhook";
import { findConnectionByExternalUser } from "@/repositories/device-connection.repository";
import { upsertRawPayload } from "@/repositories/raw-payload.repository";
import { upsertManyCanonicalMetrics } from "@/repositories/canonical-metric.repository";

const MAX_BODY_BYTES = 1_000_000; // 1 MB cap

function logEvent(event: string, fields: Record<string, unknown>) {
  // Never logs the secret or the signature.
  console.info(JSON.stringify({ event, ...fields }));
}

// Resolves the internal athleteId for a VALD event: an explicit internal
// athleteId if supplied, otherwise a VALD connection mapped by provider user id.
async function resolveAthleteId(evt: ValdEvent): Promise<string | null> {
  if (typeof evt.athleteId === "string" && evt.athleteId.trim()) return evt.athleteId.trim();
  if (typeof evt.providerAthleteId === "string" && evt.providerAthleteId.trim()) {
    const conn = await findConnectionByExternalUser("vald", evt.providerAthleteId.trim());
    return conn?.athleteId ?? null;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const secret = env.valdWebhookSecret;
    if (!secret) {
      return NextResponse.json({ error: "VALD webhook secret is not configured." }, { status: 501 });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 400 });
    }

    const signature = request.headers.get("x-vald-signature");
    if (!verifyValdSignature(rawBody, secret, signature)) {
      logEvent("vald.webhook.rejected", { reason: "invalid_signature" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let evt: ValdEvent;
    try {
      evt = JSON.parse(rawBody) as ValdEvent;
    } catch {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }
    if (!evt?.eventId || typeof evt.eventId !== "string") {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    logEvent("vald.webhook.verified", { eventId: evt.eventId });

    const athleteId = await resolveAthleteId(evt);
    if (!athleteId) {
      // Ack (200) per provider replay policy, but store nothing canonical.
      logEvent("vald.webhook.failed", { eventId: evt.eventId, reason: "unmappable_athlete" });
      return NextResponse.json({ ok: true, persisted: 0, unmapped: true }, { status: 200 });
    }

    const now = new Date();
    // Raw payload upsert is idempotent by payloadId (vald:<eventId>).
    await upsertRawPayload(rawPayloadFromVald(evt, athleteId, rawBody, now));

    const metrics = normalizeValdEvent(evt, athleteId, "default", now);
    if (metrics.length > 0) {
      await upsertManyCanonicalMetrics(metrics);
    }

    logEvent("vald.webhook.persisted", { eventId: evt.eventId, count: metrics.length });
    return NextResponse.json({ ok: true, persisted: metrics.length }, { status: 200 });
  } catch (error) {
    logEvent("vald.webhook.failed", { reason: "internal_error", detail: (error as Error).message });
    return NextResponse.json({ error: "Webhook ingestion failed" }, { status: 500 });
  }
}
