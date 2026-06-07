import { getFormRegistrySnapshot, type FormArtifact, type FormRegistrySnapshot } from "@/lib/form-registry";

export type FormFieldType = "text" | "textarea" | "select" | "multiselect" | "date" | "number" | "boolean" | "group";

export type CompiledFormField = {
  id: string;
  name: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};

export type CompiledFormContract = {
  formId: string;
  route: string;
  domain: string;
  fields: CompiledFormField[];
  apiEndpoint: string;
  responseSchemaVersion: number;
  locales: string[];
  requiresAuth: string[];
  ownerTeam: string[];
};

export type FormCompilerDiagnostic = {
  code: "INVALID_FIELD_TYPE" | "DUPLICATE_FIELD" | "MISSING_LOCALES" | "UNSUPPORTED_COMPONENT" | "EMPTY_FIELDS";
  formId: string;
  severity: "warning" | "error";
  message: string;
};

export type FormCompilerResult = {
  contracts: CompiledFormContract[];
  diagnostics: FormCompilerDiagnostic[];
  status: "success" | "failed";
  metrics: {
    contractCount: number;
    driftErrors: number;
    compilerErrorCodes: string[];
  };
};

const knownChoiceFieldHints = ["ids", "roles", "standards", "locations", "conductors", "observers", "emails", "habits"];
const supportedGdsFamilies = new Set(["alert", "button", "chart", "form", "layout", "status", "table"]);

export function compileFormContracts(snapshot: FormRegistrySnapshot = getFormRegistrySnapshot().snapshot): FormCompilerResult {
  const contracts: CompiledFormContract[] = [];
  const diagnostics: FormCompilerDiagnostic[] = [];

  for (const artifact of snapshot.artifacts) {
    diagnostics.push(...validateArtifact(artifact));
    contracts.push(compileArtifact(artifact));
  }

  const driftErrors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;

  return {
    contracts: contracts.sort((left, right) => left.formId.localeCompare(right.formId)),
    diagnostics: diagnostics.sort((left, right) => `${left.formId}:${left.code}`.localeCompare(`${right.formId}:${right.code}`)),
    status: driftErrors > 0 ? "failed" : "success",
    metrics: {
      contractCount: contracts.length,
      driftErrors,
      compilerErrorCodes: [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort()
    }
  };
}

export function compileArtifact(artifact: FormArtifact): CompiledFormContract {
  return {
    formId: artifact.id,
    route: artifact.route,
    domain: artifact.domain,
    fields: artifact.fields.map((field) => compileField(field)),
    apiEndpoint: inferApiEndpoint(artifact),
    responseSchemaVersion: 1,
    locales: artifact.locales,
    requiresAuth: artifact.requiresAuth,
    ownerTeam: artifact.ownerTeam
  };
}

export function buildFormContractMap(result: FormCompilerResult = compileFormContracts()): Record<string, CompiledFormContract> {
  return Object.fromEntries(result.contracts.map((contract) => [contract.formId, contract]));
}

export async function compileWithFallback(
  compile: () => Promise<FormCompilerResult>,
  previousStable: FormCompilerResult = compileFormContracts()
): Promise<FormCompilerResult & { recoveredFromFailure: boolean }> {
  try {
    const result = await compile();
    return { ...result, recoveredFromFailure: false };
  } catch {
    return { ...previousStable, status: "failed", recoveredFromFailure: true };
  }
}

function validateArtifact(artifact: FormArtifact): FormCompilerDiagnostic[] {
  const diagnostics: FormCompilerDiagnostic[] = [];

  if (artifact.fields.length === 0) {
    diagnostics.push(diagnostic("EMPTY_FIELDS", artifact.id, "error", "Form artifact must define at least one field."));
  }

  const duplicateFields = findDuplicates(artifact.fields);
  for (const field of duplicateFields) {
    diagnostics.push(diagnostic("DUPLICATE_FIELD", artifact.id, "error", `Duplicate field '${field}' is not allowed.`));
  }

  if (artifact.locales.length === 0) {
    diagnostics.push(diagnostic("MISSING_LOCALES", artifact.id, "error", "Form artifact must declare locale coverage."));
  }

  for (const family of artifact.gdsComponentSet) {
    if (!supportedGdsFamilies.has(family)) {
      diagnostics.push(diagnostic("UNSUPPORTED_COMPONENT", artifact.id, "error", `Unsupported GDS component family '${family}'.`));
    }
  }

  return diagnostics;
}

function compileField(field: string): CompiledFormField {
  const id = field.trim();
  const type = inferFieldType(id);
  return {
    id,
    name: id,
    type,
    required: !isOptionalField(id),
    options: type === "select" || type === "multiselect" ? [] : undefined
  };
}

function inferFieldType(field: string): FormFieldType {
  const lowered = field.toLowerCase();
  if (lowered.endsWith("date") || lowered.includes("date")) return "date";
  if (lowered.includes("load") || lowered.includes("score") || lowered.includes("readiness")) return "number";
  if (lowered.includes("notes") || lowered.includes("traits")) return "textarea";
  if (knownChoiceFieldHints.some((hint) => lowered.includes(hint))) return lowered.endsWith("ids") || lowered.endsWith("emails") ? "multiselect" : "select";
  return "text";
}

function inferApiEndpoint(artifact: FormArtifact): string {
  if (artifact.id.includes("athlete") || artifact.domain === "athletes" || artifact.domain === "profiles") return "/api/children";
  if (artifact.id.includes("team")) return "/api/teams";
  if (artifact.id.includes("settings")) return "/api/settings";
  return `/api/forms/${artifact.id}`;
}

function isOptionalField(field: string): boolean {
  const lowered = field.toLowerCase();
  return lowered.includes("notes") || lowered.includes("knowntraits") || lowered.includes("observers");
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function diagnostic(
  code: FormCompilerDiagnostic["code"],
  formId: string,
  severity: FormCompilerDiagnostic["severity"],
  message: string
): FormCompilerDiagnostic {
  return { code, formId, severity, message };
}
