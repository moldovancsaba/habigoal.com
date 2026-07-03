import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body?: unknown) {
  return new Request("http://localhost/api/forms/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/forms/validate (GH-153)", () => {
  it("400s when the form id is missing", async () => {
    const res = await POST(req({ payload: {} }));
    expect(res.status).toBe(400);
  });

  it("400s for an unknown form", async () => {
    const res = await POST(req({ form: "nope", payload: {} }));
    expect(res.status).toBe(400);
  });

  it("returns ok:false with normalized errors for a malformed payload", async () => {
    const res = await POST(req({ form: "training.load", payload: { rpe: 99 } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors).toContainEqual({ field: "rpe", code: "out_of_range", messageKey: "form.error.outOfRange" });
  });

  it("returns ok:true for a valid payload", async () => {
    const res = await POST(req({ form: "athlete.profile", payload: { status: "active" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errors).toEqual([]);
  });
});
