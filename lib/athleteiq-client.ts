// Client-side helpers for calling the AthleteIQ API surface.
//
// Every /api/athleteiq/* route returns a flat success body (payload fields plus
// correlationId/generatedAt/latencyMs) or the structured error envelope
// { code, messageKey, retryable, correlationId, details? }. These helpers
// normalise both into a discriminated result so panels can render safely.

export type AthleteIqClientError = {
  code: string;
  messageKey: string;
  retryable: boolean;
  correlationId: string;
  details?: unknown;
};

export type AthleteIqClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AthleteIqClientError };

const NETWORK_ERROR: AthleteIqClientError = {
  code: "NETWORK_ERROR",
  messageKey: "athleteiq.errors.UNKNOWN_ERROR",
  retryable: true,
  correlationId: ""
};

export async function athleteIqRequest<T>(input: string, init?: RequestInit): Promise<AthleteIqClientResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const error = isClientError(payload) ? payload : { ...NETWORK_ERROR, code: "UNKNOWN_ERROR" };
    return { ok: false, error };
  }

  return { ok: true, data: payload as T };
}

export function athleteIqJsonInit(body: unknown, method: "POST" | "PATCH" = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function isClientError(value: unknown): value is AthleteIqClientError {
  return Boolean(value) && typeof value === "object" && typeof (value as { code?: unknown }).code === "string";
}
