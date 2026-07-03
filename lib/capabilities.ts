import { env } from "@/config/env";

// Capability framework (GH-440). One source of truth for "is this feature real and
// allowed?" — resolved from env flags (and, in future, per-tenant entitlement).
// Server code imports `getCapabilities`; the client reads `/api/capabilities`.
// A capability that is off MUST render an honest "not available yet" state
// (see components/common), never fabricated data.

export type CapabilityKey =
  | "visionAi"
  | "gpsIngestion"
  | "forecasting"
  | "aiCoachNudges"
  | "cogLeague"
  | "gameFlow";

export type Capabilities = Record<CapabilityKey, boolean>;

/** Pure resolver — easy to unit-test with injected flags. */
export function resolveCapabilities(flags: Capabilities = env.capabilities): Capabilities {
  return {
    visionAi: Boolean(flags.visionAi),
    gpsIngestion: Boolean(flags.gpsIngestion),
    forecasting: Boolean(flags.forecasting),
    aiCoachNudges: Boolean(flags.aiCoachNudges),
    cogLeague: Boolean(flags.cogLeague),
    gameFlow: Boolean(flags.gameFlow),
  };
}

/** Server-side accessor (use in server components / route handlers / services). */
export function getCapabilities(): Capabilities {
  return resolveCapabilities();
}

export function isCapabilityEnabled(key: CapabilityKey): boolean {
  return getCapabilities()[key];
}
