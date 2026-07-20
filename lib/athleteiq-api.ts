import { NextResponse } from "next/server";

export type AthleteIqStructuredErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "PRODUCT_ACCESS_DENIED"
  | "VALIDATION_ERROR"
  | "MODULE_NOT_FOUND"
  | "FUTURE_MODULE_NOT_ACTIONABLE"
  | "REGISTRY_INVALID"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

export function createAthleteIqCorrelationId() {
  return `aiq-${crypto.randomUUID()}`;
}

export function athleteIqHashForLog(value: string | null | undefined) {
  if (!value) return undefined;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }
  return `a${Math.abs(hash).toString(36)}`;
}

export function athleteIqJsonError(
  code: AthleteIqStructuredErrorCode,
  status: number,
  correlationId: string,
  options: { retryable?: boolean; messageKey?: string; details?: unknown } = {}
) {
  return NextResponse.json(
    {
      code,
      messageKey: options.messageKey || `athleteiq.errors.${code}`,
      retryable: options.retryable ?? false,
      correlationId,
      ...(options.details ? { details: options.details } : {})
    },
    { status }
  );
}
