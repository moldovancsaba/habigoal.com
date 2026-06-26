import {
  buildFuelGuidanceEntry,
  buildLearningItemProgress,
  buildLiteModuleGatewaySummary,
  buildManualWearableEntry,
  buildRecoveryLiteEntry,
  validateLiteModuleEntryRequest,
  withLiteGatewayTimeout
} from "@/lib/athleteiq-lite-modules";
import { listLiteModuleEntriesByDay, upsertLiteModuleEntry } from "@/repositories/athleteiq-lite-modules.repository";

export async function createRecoveryLiteEntry(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string }) {
  const validation = validateLiteModuleEntryRequest("recovery_lite", input.body);
  if (validation.errors.length) return { entry: null, errors: validation.errors, warnings: validation.warnings };
  const entry = buildRecoveryLiteEntry(input);
  return { entry: await withLiteGatewayTimeout(upsertLiteModuleEntry(entry)), errors: [], warnings: validation.warnings };
}

export async function createFuelLiteEntry(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string }) {
  const validation = validateLiteModuleEntryRequest("fuel_lite", input.body);
  if (validation.errors.length) return { entry: null, errors: validation.errors, warnings: validation.warnings };
  const entry = buildFuelGuidanceEntry(input);
  return { entry: await withLiteGatewayTimeout(upsertLiteModuleEntry(entry)), errors: [], warnings: validation.warnings };
}

export async function createLearningProgress(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string }) {
  const validation = validateLiteModuleEntryRequest("learning_lite", input.body);
  if (validation.errors.length) return { entry: null, errors: validation.errors, warnings: validation.warnings };
  const entry = buildLearningItemProgress(input);
  return { entry: await withLiteGatewayTimeout(upsertLiteModuleEntry(entry)), errors: [], warnings: validation.warnings };
}

export async function createManualWearableEntry(input: { body: Record<string, unknown>; actorEmail: string; idempotencyKey?: string }) {
  const validation = validateLiteModuleEntryRequest("wearable_manual_sync", input.body);
  if (validation.errors.length) return { entry: null, errors: validation.errors, warnings: validation.warnings };
  const entry = buildManualWearableEntry({ ...input, warnings: validation.warnings });
  return { entry: await withLiteGatewayTimeout(upsertLiteModuleEntry(entry)), errors: [], warnings: validation.warnings };
}

export async function getLiteModuleDailySummary(input: { athleteId: string; localDate: string }) {
  const entries = await withLiteGatewayTimeout(listLiteModuleEntriesByDay(input));
  return buildLiteModuleGatewaySummary({ ...input, entries });
}
