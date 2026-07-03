import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongodb", () => ({ getDatabase: vi.fn(async () => ({})) }));
vi.mock("@/scripts/seed-haho-ecosystem.mjs", () => ({
  runHahoSeed: vi.fn(async () => ({ ok: true, trainers: 5, athletes: 25 })),
}));

import { POST } from "./route";
import { runHahoSeed } from "@/scripts/seed-haho-ecosystem.mjs";

const mSeed = vi.mocked(runHahoSeed);

function req(headers: Record<string, string> = {}, url = "http://localhost/api/ops/seed-haho-ecosystem") {
  return new Request(url, { method: "POST", headers });
}

const ORIGINAL = process.env.OPS_SEED_TOKEN;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.OPS_SEED_TOKEN;
  else process.env.OPS_SEED_TOKEN = ORIGINAL;
});
beforeEach(() => vi.clearAllMocks());

describe("POST /api/ops/seed-haho-ecosystem (GH-427)", () => {
  it("404s when OPS_SEED_TOKEN is not configured (endpoint disabled)", async () => {
    delete process.env.OPS_SEED_TOKEN;
    const res = await POST(req({ "x-ops-token": "anything" }));
    expect(res.status).toBe(404);
    expect(mSeed).not.toHaveBeenCalled();
  });

  it("403s when the token is missing or wrong", async () => {
    process.env.OPS_SEED_TOKEN = "secret";
    expect((await POST(req())).status).toBe(403);
    expect((await POST(req({ "x-ops-token": "nope" }))).status).toBe(403);
    expect(mSeed).not.toHaveBeenCalled();
  });

  it("runs the seed and returns the manifest with the correct token", async () => {
    process.env.OPS_SEED_TOKEN = "secret";
    const res = await POST(req({ "x-ops-token": "secret" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.manifest).toMatchObject({ trainers: 5, athletes: 25 });
    expect(mSeed).toHaveBeenCalledTimes(1);
  });

  it("passes a clamped days override from the query string", async () => {
    process.env.OPS_SEED_TOKEN = "secret";
    await POST(req({ "x-ops-token": "secret" }, "http://localhost/api/ops/seed-haho-ecosystem?days=999"));
    expect(mSeed).toHaveBeenCalledWith(expect.anything(), { days: 120 });
  });
});
