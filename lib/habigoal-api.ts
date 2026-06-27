import { NextResponse } from "next/server";

export type HabigoalStructuredErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "PRODUCT_ACCESS_DENIED"
  | "VALIDATION_ERROR"
  | "PROFILE_REQUIRED"
  | "TIMEOUT"
  | "ATLAS_ERROR"
  | "UNKNOWN_ERROR";

export function createHabigoalCorrelationId() {
  return `hbg-${crypto.randomUUID()}`;
}

export function habigoalJsonError(
  code: HabigoalStructuredErrorCode,
  status: number,
  correlationId: string,
  options: { retryable?: boolean; details?: unknown } = {}
) {
  return NextResponse.json(
    {
      ok: false,
      code,
      retryable: options.retryable ?? false,
      correlationId,
      ...(options.details ? { details: options.details } : {})
    },
    { status }
  );
}

export function logHabigoalEvent(
  event: string,
  input: {
    athleteId?: string | null;
    correlationId: string;
    durationMs?: number;
    errorClass?: string;
    operationId?: string;
    retryable?: boolean;
    status: "start" | "success" | "failure";
    userEmail?: string | null;
  }
) {
  const payload = {
    event,
    correlationId: input.correlationId,
    status: input.status,
    operationId: input.operationId,
    athleteIdHash: input.athleteId ? hashForLog(input.athleteId) : undefined,
    userHash: input.userEmail ? hashForLog(input.userEmail.toLowerCase()) : undefined,
    errorClass: input.errorClass,
    retryable: input.retryable,
    durationMs: input.durationMs
  };

  const line = JSON.stringify(payload);
  if (input.status === "failure") {
    console.warn(line);
    return;
  }
  console.info(line);
}

function hashForLog(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}
