export type RecoverableRequestResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string };

export async function runRecoverableJsonRequest<T>({
  request,
  fallbackError,
  parseError
}: {
  request: () => Promise<Response>;
  fallbackError: string;
  parseError?: (response: Response) => Promise<string | null>;
}): Promise<RecoverableRequestResult<T>> {
  const response = await request().catch((error: Error) => error);

  if (response instanceof Error) {
    return { ok: false, data: null, error: response.message || fallbackError };
  }

  if (!response.ok) {
    const parsedError = parseError ? await parseError(response) : null;
    return { ok: false, data: null, error: parsedError ?? fallbackError };
  }

  const data = (await response.json().catch(() => null)) as T | null;
  if (!data) {
    return { ok: false, data: null, error: fallbackError };
  }

  return { ok: true, data, error: null };
}
