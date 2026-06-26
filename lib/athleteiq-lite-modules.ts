import { ATHLETEIQ_MODULE_REGISTRY, ATHLETEIQ_MODULE_REGISTRY_VERSION, getAthleteIqModule, toAthleteIqModuleView } from "@/lib/athleteiq-modules";
import type {
  FuelGuidanceEntry,
  FuelStatus,
  LearningItemProgress,
  LearningProgressStatus,
  LiteModuleBaseEntry,
  LiteModuleDailySummary,
  LiteModuleEntry,
  LiteModuleGatewayCapability,
  LiteModuleGatewaySummary,
  LiteModuleKey,
  ManualWearableEntry,
  ManualWearableMetricKey,
  RecoveryLiteEntry
} from "@/types/athleteiq-lite-modules";

export const ATHLETEIQ_LITE_GATEWAY_CAPABILITY_KEY = "AIQ-1320";
export const ATHLETEIQ_LITE_GATEWAY_VERSION = "aiq-lite-gateway-1320.1";
export const ATHLETEIQ_LITE_GATEWAY_TIMEOUT_MS = 2500;

const manualSourceLabelKey = "athleteiq.sources.manualEntry";
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const liteModuleKeys: LiteModuleKey[] = ["recovery_lite", "fuel_lite", "learning_lite", "wearable_manual_sync"];
const fuelStatuses: FuelStatus[] = ["on_track", "late", "missed", "unknown"];
const learningStatuses: LearningProgressStatus[] = ["not_started", "in_progress", "completed", "skipped"];
const wearableMetrics: Record<ManualWearableMetricKey, { unit: string; min: number; max: number; warningMin?: number; warningMax?: number }> = {
  resting_heart_rate: { unit: "bpm", min: 25, max: 220, warningMin: 35, warningMax: 110 },
  hrv_ms: { unit: "ms", min: 1, max: 300, warningMin: 10, warningMax: 220 },
  sleep_hours: { unit: "h", min: 0, max: 24, warningMin: 3, warningMax: 14 },
  steps: { unit: "steps", min: 0, max: 100000, warningMax: 50000 },
  body_weight_kg: { unit: "kg", min: 20, max: 250 },
  training_load_au: { unit: "au", min: 0, max: 2000, warningMax: 1200 }
};

export function listLiteModuleCapabilities(): LiteModuleGatewayCapability[] {
  return liteModuleKeys.map((moduleKey) => {
    const definition = getLiteModuleDefinition(moduleKey);
    const view = toAthleteIqModuleView(definition);
    const hasPlannedSource = definition.dataSources.some((source) => source.availability === "planned");

    return {
      moduleKey,
      displayNameKey: view.displayNameKey,
      summaryKey: view.summaryKey,
      status: hasPlannedSource ? "planned_integration" : moduleKey === "learning_lite" ? "content_available" : "manual_available",
      maturity: view.maturity,
      claimBoundary: view.claimBoundary,
      source: "manual",
      sourceLabelKey: manualSourceLabelKey,
      dataUsed: definition.dataSources.filter((source) => source.availability === "manual").map((source) => source.key),
      missingData: definition.dataSources.filter((source) => source.availability === "planned").map((source) => source.key),
      plannedIntegrationLabelKey: hasPlannedSource ? "athleteiq.liteGateway.plannedIntegration" : undefined,
      routes: definition.routes
    };
  });
}

export function validateLiteModuleEntryRequest(moduleKey: LiteModuleKey, body: Record<string, unknown> | null) {
  const errors = validateBase(body);
  const warnings: string[] = [];

  if (!getLiteModuleDefinition(moduleKey)) errors.push(`Unsupported lite module: ${moduleKey}`);

  if (moduleKey === "recovery_lite") {
    if (!stringValue(body?.protocolKey)) errors.push("protocolKey is required");
    if (!isIsoDateTime(stringValue(body?.completedAt))) errors.push("completedAt must be an ISO datetime");
    const perceivedRecovery = numberValue(body?.perceivedRecovery);
    if (!Number.isInteger(perceivedRecovery) || perceivedRecovery < 1 || perceivedRecovery > 5) errors.push("perceivedRecovery must be an integer from 1 to 5");
  }

  if (moduleKey === "fuel_lite") {
    if (!fuelStatuses.includes(stringValue(body?.mealTimingStatus) as FuelStatus)) errors.push("mealTimingStatus must be on_track, late, missed, or unknown");
    if (!fuelStatuses.includes(stringValue(body?.hydrationStatus) as FuelStatus)) errors.push("hydrationStatus must be on_track, late, missed, or unknown");
    const note = stringValue(body?.note);
    if (note && note.length > 500) errors.push("note must be 500 characters or fewer");
  }

  if (moduleKey === "learning_lite") {
    if (!stringValue(body?.itemId)) errors.push("itemId is required");
    const status = stringValue(body?.status) as LearningProgressStatus;
    if (!learningStatuses.includes(status)) errors.push("status must be not_started, in_progress, completed, or skipped");
    if (status === "completed" && !isIsoDateTime(stringValue(body?.completedAt))) errors.push("completedAt is required for completed learning progress");
  }

  if (moduleKey === "wearable_manual_sync") {
    const metricKey = stringValue(body?.metricKey) as ManualWearableMetricKey;
    const config = wearableMetrics[metricKey];
    if (!config) errors.push("metricKey is not supported");
    const value = numberValue(body?.value);
    if (!Number.isFinite(value)) errors.push("value must be numeric");
    if (config && Number.isFinite(value)) {
      if (value < config.min || value > config.max) errors.push(`value is outside plausible ${metricKey} bounds`);
      if ((config.warningMin !== undefined && value < config.warningMin) || (config.warningMax !== undefined && value > config.warningMax)) {
        warnings.push(`manual_wearable_outlier:${metricKey}`);
      }
    }
    const unit = stringValue(body?.unit);
    if (!unit) errors.push("unit is required");
    if (config && unit && unit !== config.unit) warnings.push(`manual_wearable_unit_expected:${config.unit}`);
    if (!isIsoDateTime(stringValue(body?.measuredAt))) errors.push("measuredAt must be an ISO datetime");
  }

  return { errors, warnings };
}

export function buildRecoveryLiteEntry(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string; now?: Date }): RecoveryLiteEntry {
  const base = baseEntry("recovery_lite", "recovery", input.body, input.actorEmail, input.idempotencyKey, input.now ?? new Date(), []);
  return {
    ...base,
    protocolKey: stringValue(input.body.protocolKey),
    completedAt: stringValue(input.body.completedAt),
    perceivedRecovery: numberValue(input.body.perceivedRecovery)
  };
}

export function buildFuelGuidanceEntry(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string; now?: Date }): FuelGuidanceEntry {
  const base = baseEntry("fuel_lite", "fuel", input.body, input.actorEmail, input.idempotencyKey, input.now ?? new Date(), []);
  const note = stringValue(input.body.note);
  return {
    ...base,
    mealTimingStatus: stringValue(input.body.mealTimingStatus) as FuelStatus,
    hydrationStatus: stringValue(input.body.hydrationStatus) as FuelStatus,
    ...(note ? { note } : {})
  };
}

export function buildLearningItemProgress(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string; now?: Date }): LearningItemProgress {
  const base = baseEntry("learning_lite", "learning", input.body, input.actorEmail, input.idempotencyKey, input.now ?? new Date(), []);
  const completedAt = stringValue(input.body.completedAt);
  return {
    ...base,
    itemId: stringValue(input.body.itemId),
    status: stringValue(input.body.status) as LearningProgressStatus,
    ...(completedAt ? { completedAt } : {})
  };
}

export function buildManualWearableEntry(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string; warnings?: string[]; now?: Date }): ManualWearableEntry {
  const base = baseEntry("wearable_manual_sync", "manual_wearable", input.body, input.actorEmail, input.idempotencyKey, input.now ?? new Date(), input.warnings ?? []);
  return {
    ...base,
    metricKey: stringValue(input.body.metricKey) as ManualWearableMetricKey,
    value: numberValue(input.body.value),
    unit: stringValue(input.body.unit),
    measuredAt: stringValue(input.body.measuredAt),
    integrationStatus: "not_connected_manual_only",
    deviceConnectionClaim: false
  };
}

export function buildLiteModuleGatewaySummary(input: { athleteId: string; localDate: string; entries: LiteModuleEntry[]; now?: Date }): LiteModuleGatewaySummary {
  const summaries = liteModuleKeys.map((moduleKey) => summarizeLiteModule(input.athleteId, input.localDate, moduleKey, input.entries.filter((entry) => entry.moduleKey === moduleKey)));
  return {
    athleteId: input.athleteId,
    localDate: input.localDate,
    summaries,
    dataUsed: Array.from(new Set(summaries.flatMap((summary) => summary.dataUsed))),
    missingData: Array.from(new Set(summaries.flatMap((summary) => summary.missingData))),
    generatedAt: (input.now ?? new Date()).toISOString(),
    capabilityKey: ATHLETEIQ_LITE_GATEWAY_CAPABILITY_KEY,
    version: ATHLETEIQ_LITE_GATEWAY_VERSION
  };
}

export function validateLiteModuleSummaryClaimBoundaries(summary: LiteModuleGatewaySummary) {
  const errors: string[] = [];
  for (const moduleSummary of summary.summaries) {
    if (moduleSummary.source !== "manual") errors.push(`${moduleSummary.moduleKey} must remain manual source`);
    if (moduleSummary.moduleKey === "wearable_manual_sync" && !moduleSummary.missingData.includes("wearable_normalisation")) {
      errors.push("manual wearable summary must keep wearable_normalisation marked missing until a real integration exists");
    }
  }
  return errors;
}

export function validateLiteGatewayRegistryCoverage() {
  const missing = liteModuleKeys.filter((key) => !ATHLETEIQ_MODULE_REGISTRY.some((module) => module.key === key && module.maturity === "lite_manual"));
  return { ok: missing.length === 0, missing };
}

export function withLiteGatewayTimeout<T>(operation: Promise<T>, timeoutMs = ATHLETEIQ_LITE_GATEWAY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("LITE_GATEWAY_TIMEOUT")), timeoutMs);
    })
  ]);
}

function summarizeLiteModule(athleteId: string, localDate: string, moduleKey: LiteModuleKey, entries: LiteModuleEntry[]): LiteModuleDailySummary {
  const capability = listLiteModuleCapabilities().find((candidate) => candidate.moduleKey === moduleKey)!;
  const latest = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const warnings = Array.from(new Set(entries.flatMap((entry) => entry.validationWarnings)));
  const missingData = entries.length ? capability.missingData : Array.from(new Set([...capability.dataUsed, ...capability.missingData]));

  return {
    athleteId,
    localDate,
    moduleKey,
    status: capability.status,
    source: "manual",
    sourceLabelKey: capability.sourceLabelKey,
    claimBoundary: capability.claimBoundary,
    confidence: entries.length ? (warnings.length ? "low" : "medium") : "insufficient",
    latestEntryAt: latest?.updatedAt,
    entryCount: entries.length,
    facts: entries.length ? factsForEntries(moduleKey, entries) : ["No manual lite-module facts recorded for this date."],
    dataUsed: entries.length ? capability.dataUsed : [],
    missingData,
    validationWarnings: warnings,
    planReasonLabels: entries.length ? [`athleteiq.liteGateway.planReason.${moduleKey}`] : [`athleteiq.liteGateway.planReason.${moduleKey}.missing`],
    reportEvidenceLabels: [capability.sourceLabelKey, ...missingData.map((key) => `athleteiq.sources.missing.${key}`)]
  };
}

function factsForEntries(moduleKey: LiteModuleKey, entries: LiteModuleEntry[]) {
  if (moduleKey === "recovery_lite") {
    const latest = entries.filter((entry): entry is RecoveryLiteEntry => entry.entryKind === "recovery").at(-1);
    return latest ? [`Recovery protocol: ${latest.protocolKey}`, `Perceived recovery: ${latest.perceivedRecovery}/5`] : [];
  }
  if (moduleKey === "fuel_lite") {
    const latest = entries.filter((entry): entry is FuelGuidanceEntry => entry.entryKind === "fuel").at(-1);
    return latest ? [`Meal timing: ${latest.mealTimingStatus}`, `Hydration: ${latest.hydrationStatus}`] : [];
  }
  if (moduleKey === "learning_lite") {
    const completed = entries.filter((entry): entry is LearningItemProgress => entry.entryKind === "learning" && entry.status === "completed").length;
    return [`Learning items completed: ${completed}`, `Learning progress entries: ${entries.length}`];
  }
  const wearableEntries = entries.filter((entry): entry is ManualWearableEntry => entry.entryKind === "manual_wearable");
  return wearableEntries.map((entry) => `${entry.metricKey}: ${entry.value} ${entry.unit}`);
}

function baseEntry<K extends LiteModuleKey, E extends LiteModuleEntry["entryKind"]>(
  moduleKey: K,
  entryKind: E,
  body: Record<string, unknown>,
  actorEmail: string,
  idempotencyKey: string | undefined,
  now: Date,
  validationWarnings: string[]
): Omit<LiteModuleBaseEntry, "moduleKey" | "entryKind"> & { moduleKey: K; entryKind: E } {
  const definition = getLiteModuleDefinition(moduleKey);
  const timestamp = now.toISOString();
  const status = definition.dataSources.some((source) => source.availability === "planned")
    ? "planned_integration"
    : moduleKey === "learning_lite" ? "content_available" : "manual_available";

  return {
    id: `${moduleKey}:${crypto.randomUUID()}`,
    athleteId: stringValue(body.athleteId),
    localDate: stringValue(body.localDate),
    timezone: stringValue(body.timezone) || "UTC",
    moduleKey,
    entryKind,
    source: "manual" as const,
    sourceLabelKey: manualSourceLabelKey,
    claimBoundary: definition.claimBoundary,
    moduleStatus: status,
    idempotencyKey,
    actorEmail,
    createdAt: timestamp,
    updatedAt: timestamp,
    dataUsed: ["manual_daily_entry"],
    missingData: definition.dataSources.filter((source) => source.availability === "planned").map((source) => source.key),
    validationWarnings,
    auditHistory: [`created:${timestamp}:${actorEmail}`]
  };
}

function validateBase(body: Record<string, unknown> | null) {
  const errors: string[] = [];
  if (!body || typeof body !== "object") return ["body is required"];
  if (!stringValue(body.athleteId)) errors.push("athleteId is required");
  if (!localDatePattern.test(stringValue(body.localDate))) errors.push("localDate must use YYYY-MM-DD");
  return errors;
}

function getLiteModuleDefinition(moduleKey: LiteModuleKey) {
  const definition = getAthleteIqModule(moduleKey);
  if (!definition || definition.maturity !== "lite_manual") {
    throw new Error(`Lite module ${moduleKey} is not registered as lite_manual in ${ATHLETEIQ_MODULE_REGISTRY_VERSION}`);
  }
  return definition;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
}

function isIsoDateTime(value: string) {
  return Boolean(value && !Number.isNaN(Date.parse(value)) && value.includes("T"));
}
