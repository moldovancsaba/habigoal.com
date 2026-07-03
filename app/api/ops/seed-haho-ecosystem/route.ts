import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { jsonError } from "@/lib/api";

// Demo-ecosystem seeding for production (GH-427/GH-334). This runs the tested seed
// routine against the app's live database (where MONGODB_URI is configured), so
// the Haho roster (5 trainers + 25 athletes @haho.ai with ~90 days of history)
// can be created without direct DB access.
//
// Guarded by a deploy-time secret: set OPS_SEED_TOKEN in the environment and send
// it as the `x-ops-token` header. When the env var is unset the endpoint is
// disabled (404), so it is inert unless an operator explicitly enables it.
// The seed is idempotent (upserts keyed by stable ids), so repeat calls are safe.
export const maxDuration = 300; // bulk insert over many collections can take a while

export async function POST(request: Request) {
  const expected = process.env.OPS_SEED_TOKEN;
  if (!expected) {
    return jsonError("Seeding endpoint is disabled", 404, "NOT_FOUND");
  }
  const provided = request.headers.get("x-ops-token");
  if (!provided || provided !== expected) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const daysParam = Number(new URL(request.url).searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 120) : undefined;

  try {
    const seedModule = (await import("@/scripts/seed-haho-ecosystem.mjs")) as {
      runHahoSeed: (db: unknown, options?: { days?: number }) => Promise<Record<string, unknown>>;
    };
    const db = await getDatabase();
    const manifest = await seedModule.runHahoSeed(db, days ? { days } : {});
    return NextResponse.json({ ok: true, manifest });
  } catch (error) {
    console.error("Haho ecosystem seed failed:", error);
    return jsonError("Seed failed", 500, "SEED_FAILED");
  }
}
