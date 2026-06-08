import { WearableConnector, DeviceConnection } from "../types/wearable-connector";
import { requireConsent } from "./consent";
import { updateTwinFromMetrics } from "./twin-updater";
import { upsertManyRawPayloads } from "../repositories/raw-payload.repository";
import { upsertManyCanonicalMetrics } from "../repositories/canonical-metric.repository";
import { updateConnectionStatus } from "../repositories/device-connection.repository";
// We don't have all specific normalisers yet, so we will use a registry/factory approach
// that can be extended in the future.
import { RawPayload, CanonicalMetric } from "../types/canonical-metric";

// Abstract definition for normalisation function map
export type PayloadNormaliser = (payload: RawPayload, athleteId: string) => CanonicalMetric[];

const normaliserRegistry: Record<string, PayloadNormaliser> = {
  // To be implemented by specific connectors e.g., 'oura', 'garmin'
};

export function registerNormaliser(source: string, normaliser: PayloadNormaliser) {
  normaliserRegistry[source] = normaliser;
}

export function normaliseRawPayload(
  payload: RawPayload,
  athleteId: string,
  organisationId: string
): CanonicalMetric[] {
  const normaliser = normaliserRegistry[payload.source];
  if (!normaliser) {
    console.warn(`No normaliser registered for source: ${payload.source}`);
    return [];
  }
  
  // Normalisers will need organisationId, so we pass it or they handle it
  // For simplicity we assume normaliser injects or we inject post-normalisation
  const metrics = normaliser(payload, athleteId);
  return metrics.map(m => ({ ...m, organisationId, rawPayloadId: payload.payloadId }));
}

export async function ingestForConnection(
  connector: WearableConnector,
  connection: DeviceConnection,
  from: string,
  to: string
): Promise<{ metrics: number; errors: string[] }> {
  try {
    const refreshedConnection = await connector.refreshTokenIfNeeded(connection);
    
    // Explicit consent gate
    await requireConsent(connection.athleteId, "wearable_data");
    
    const rawPayloads = await connector.fetchMetrics(refreshedConnection, from, to);
    
    if (rawPayloads.length === 0) {
      await updateConnectionStatus(connection.connectionId, "active");
      return { metrics: 0, errors: [] };
    }

    await upsertManyRawPayloads(rawPayloads);
    
    const canonicalMetrics = rawPayloads.flatMap(p => 
      normaliseRawPayload(p, connection.athleteId, connection.organisationId)
    );
    
    if (canonicalMetrics.length > 0) {
      await upsertManyCanonicalMetrics(canonicalMetrics);
      // Twin updater updates history and 7d running totals
      await updateTwinFromMetrics(connection.athleteId, connection.organisationId, to, canonicalMetrics);
    }
    
    await updateConnectionStatus(connection.connectionId, "active");
    
    return { metrics: canonicalMetrics.length, errors: [] };
  } catch (error: unknown) {
    console.error(`Ingestion error for connection ${connection.connectionId}:`, error);
    
    // Check if error is related to consent
    const err = error as Error & { code?: string };
    if (err.code === "CONSENT_REQUIRED") {
      await updateConnectionStatus(connection.connectionId, "error", "Consent withdrawn or required");
    } else {
      await updateConnectionStatus(connection.connectionId, "error", err.message || "Unknown error");
    }

    return { metrics: 0, errors: [err.message || "Unknown error"] };
  }
}
