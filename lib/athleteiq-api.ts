import { NextResponse } from "next/server";

export type AthleteIqStructuredErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "MODULE_NOT_FOUND"
  | "FUTURE_MODULE_NOT_ACTIONABLE"
  | "REGISTRY_INVALID"
  | "UNKNOWN_ERROR";

export function createAthleteIqCorrelationId() {
  return `aiq-${crypto.randomUUID()}`;
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
