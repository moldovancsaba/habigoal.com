import { timingSafeEqual } from "crypto";

// Authorize a scheduled (cron) request. Follows the Vercel Cron convention: when
// CRON_SECRET is configured, Vercel sends `Authorization: Bearer <CRON_SECRET>`.
// An external scheduler can use the same header. Comparison is constant-time.
// Returns false when the secret is unset (callers should surface 503, never run
// the worker on an open endpoint).
export function authorizeCronRequest(authHeader: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const provided = Buffer.from(authHeader);
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
