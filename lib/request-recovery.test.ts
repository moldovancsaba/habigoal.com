import { describe, expect, it } from "vitest";
import { runRecoverableJsonRequest } from "@/lib/request-recovery";

describe("runRecoverableJsonRequest", () => {
  it("returns parsed JSON for successful requests", async () => {
    const result = await runRecoverableJsonRequest<{ ok: boolean }>({
      fallbackError: "failed",
      request: async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
    });

    expect(result).toEqual({ ok: true, data: { ok: true }, error: null });
  });

  it("returns a parsed API error without inventing fallback persistence", async () => {
    const result = await runRecoverableJsonRequest<{ ok: boolean }>({
      fallbackError: "failed",
      parseError: async () => "api failed",
      request: async () => new Response(JSON.stringify({ error: "api failed" }), { status: 400 })
    });

    expect(result).toEqual({ ok: false, data: null, error: "api failed" });
  });

  it("returns network errors as recoverable errors", async () => {
    const result = await runRecoverableJsonRequest<{ ok: boolean }>({
      fallbackError: "failed",
      request: async () => {
        throw new Error("network down");
      }
    });

    expect(result).toEqual({ ok: false, data: null, error: "network down" });
  });
});
