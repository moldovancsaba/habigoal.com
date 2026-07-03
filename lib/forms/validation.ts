import type { CentralFormField } from "./central-form";
import {
  checkInSetupFields,
  trainingLoadFields,
  checkInNotesFields,
  athleteProfileFields
} from "./central-form";

// Cross-layer form validation gateway (GH-153). One contract-derived validator
// shared by client submit hooks and server route handlers, so browser-side
// checks and persisted-data acceptance can never diverge. Errors use a single
// normalized, path-based shape.

export type ValidationCode = "required" | "invalid_type" | "out_of_range";

export type ValidationError = {
  field: string;
  code: ValidationCode;
  messageKey: string;
};

const MESSAGE_KEYS: Record<ValidationCode, string> = {
  required: "form.error.required",
  invalid_type: "form.error.invalidType",
  out_of_range: "form.error.outOfRange"
};

function isPresent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function err(field: string, code: ValidationCode): ValidationError {
  return { field, code, messageKey: MESSAGE_KEYS[code] };
}

// Validate a payload against a contract. Deterministic and pure so the identical
// call runs on both the client and the server.
export function validateContract(
  fields: readonly CentralFormField<Record<string, unknown>>[],
  values: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = values[field.key];
    const present = isPresent(value);

    if (!present) {
      if (field.required) errors.push(err(field.key, "required"));
      continue; // optional & empty → nothing more to check
    }

    if (field.kind === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(err(field.key, "invalid_type"));
        continue;
      }
      if ((field.min != null && value < field.min) || (field.max != null && value > field.max)) {
        errors.push(err(field.key, "out_of_range"));
      }
      continue;
    }

    if (field.kind === "select" || field.kind === "searchable-select") {
      if (typeof value !== "string") {
        errors.push(err(field.key, "invalid_type"));
      } else if ((field.options?.length ?? 0) > 0 && !field.options!.some((o) => o.value === value)) {
        errors.push(err(field.key, "invalid_type"));
      }
      continue;
    }

    // text / date / textarea expect strings; max bounds the stored length.
    if (typeof value !== "string") {
      errors.push(err(field.key, "invalid_type"));
    } else if (field.max != null && value.length > field.max) {
      errors.push(err(field.key, "out_of_range"));
    }
  }

  return errors;
}

export function isValidationOk(errors: ValidationError[]): boolean {
  return errors.length === 0;
}

// Named registry so a form id (used by both client and the debug endpoint)
// resolves to its canonical contract.
export const FORM_CONTRACTS = {
  "checkin.setup": checkInSetupFields,
  "training.load": trainingLoadFields,
  "checkin.notes": checkInNotesFields,
  "athlete.profile": athleteProfileFields
} as const satisfies Record<string, readonly CentralFormField<Record<string, never>>[]>;

export type FormContractId = keyof typeof FORM_CONTRACTS;

export function getFormContract(
  id: string
): readonly CentralFormField<Record<string, unknown>>[] | null {
  return (
    (FORM_CONTRACTS as Record<string, readonly CentralFormField<Record<string, unknown>>[]>)[id] ?? null
  );
}
