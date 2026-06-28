import { env } from "@/config/env";
import { insertTelemetryEvent } from "@/repositories/telemetry.repository";
import type { TelemetryEvent, TelemetryProps } from "@/types/telemetry";

// Privacy-safe product telemetry (#88). Replaces ad-hoc console logging with a
// single sink. Rules: never record PII; only scalar props survive; emitting is
// best-effort and gated by `env.telemetryEnabled` (default off). The PII guard is
// a denylist on key names PLUS a scalar-only value filter, so an accidental
// object/array or an email-like field is dropped rather than stored.

const PII_KEY = /(email|e-mail|name|phone|tel|address|postcode|zip|dob|birth|ssn|token|secret|password|ip)/i;

export function isPiiKey(key: string): boolean {
  return PII_KEY.test(key);
}

/** Pure builder — strips PII keys and non-scalar values. Easy to unit-test. */
export function buildTelemetryEvent(
  event: string,
  options: { correlationId?: string; props?: Record<string, unknown>; now: string }
): TelemetryEvent {
  const safe: TelemetryProps = {};
  for (const [key, value] of Object.entries(options.props ?? {})) {
    if (isPiiKey(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return {
    event,
    ...(options.correlationId ? { correlationId: options.correlationId } : {}),
    occurredAt: options.now,
    props: safe,
  };
}

/** Best-effort, fire-and-forget. No-op when telemetry is disabled; never throws. */
export async function track(
  event: string,
  options: { correlationId?: string; props?: Record<string, unknown> } = {}
): Promise<void> {
  if (!env.telemetryEnabled) return;
  try {
    const built = buildTelemetryEvent(event, { ...options, now: new Date().toISOString() });
    await insertTelemetryEvent(built);
  } catch {
    // Telemetry must never break the request path.
  }
}
