import { registerNormaliser } from "@/lib/wearable-ingestion";
import { normaliseGarminToMetrics } from "@/lib/normalisers/garmin.normaliser";
import { normaliseWhoopToMetrics } from "@/lib/normalisers/whoop.normaliser";
import { normaliseOuraToMetrics } from "@/lib/normalisers/oura.normaliser";
import { normalisePolarToMetrics } from "@/lib/normalisers/polar.normaliser";
import { normaliseAppleHealthToMetrics } from "@/lib/normalisers/apple_health.normaliser";
import type { RawPayload } from "@/types/canonical-metric";

let initialised = false;

export function ensurePlatformInitialised(): void {
  if (initialised) return;
  initialised = true;

  registerNormaliser("garmin", (payload: RawPayload, athleteId: string) =>
    normaliseGarminToMetrics(payload.payload as Record<string, unknown>, athleteId, payload.payloadId)
  );
  registerNormaliser("whoop", (payload: RawPayload, athleteId: string) =>
    normaliseWhoopToMetrics(payload.payload as Record<string, unknown>, athleteId, payload.payloadId)
  );
  registerNormaliser("oura", (payload: RawPayload, athleteId: string) =>
    normaliseOuraToMetrics(payload.payload as Record<string, unknown>, athleteId, payload.payloadId)
  );
  registerNormaliser("polar", (payload: RawPayload, athleteId: string) =>
    normalisePolarToMetrics(payload.payload as Record<string, unknown>, athleteId, payload.payloadId)
  );
  registerNormaliser("apple_health", (payload: RawPayload, athleteId: string) =>
    normaliseAppleHealthToMetrics(payload.payload as Record<string, unknown>, athleteId, payload.payloadId)
  );

  // Side-effect imports start event listeners
  void import("@/services/vision-ai.service");
}
