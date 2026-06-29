// Type declaration for the seed routine exported by seed-haho-ecosystem.mjs so
// the in-app ops endpoint can import it under strict TypeScript.
export function runHahoSeed(
  db: unknown,
  options?: { days?: number }
): Promise<Record<string, unknown>>;
