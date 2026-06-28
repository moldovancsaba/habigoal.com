import { describe, expect, it } from "vitest";
import { createWearableState, signWearableState, verifyWearableState, WEARABLE_OAUTH_STATE_TTL_MS } from "@/lib/wearable-oauth-state";

const secret = "unit-test-secret";
const now = new Date("2026-06-28T12:00:00.000Z");

describe("wearable OAuth state", () => {
  it("round-trips a valid signed state", () => {
    const token = createWearableState({ athleteId: "a1", provider: "oura", locale: "hu", nonce: "n1" }, secret, now);
    const binding = verifyWearableState(token, secret, now);
    expect(binding).toMatchObject({ athleteId: "a1", provider: "oura", locale: "hu", nonce: "n1" });
    expect(binding?.exp).toBe(now.getTime() + WEARABLE_OAUTH_STATE_TTL_MS);
  });

  it("rejects a tampered payload", () => {
    const token = createWearableState({ athleteId: "a1", provider: "oura", locale: "en", nonce: "n1" }, secret, now);
    const [payload, sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ athleteId: "attacker", provider: "oura", locale: "en", nonce: "n1", exp: now.getTime() + 1000 })).toString("base64url");
    expect(verifyWearableState(`${forgedPayload}.${sig}`, secret, now)).toBeNull();
    expect(verifyWearableState(`${payload}.deadbeef`, secret, now)).toBeNull();
  });

  it("rejects a state signed with a different secret", () => {
    const token = signWearableState({ athleteId: "a1", provider: "oura", locale: "en", nonce: "n1", exp: now.getTime() + 1000 }, "other-secret");
    expect(verifyWearableState(token, secret, now)).toBeNull();
  });

  it("rejects an expired state", () => {
    const token = createWearableState({ athleteId: "a1", provider: "oura", locale: "en", nonce: "n1" }, secret, now);
    const later = new Date(now.getTime() + WEARABLE_OAUTH_STATE_TTL_MS + 1);
    expect(verifyWearableState(token, secret, later)).toBeNull();
  });

  it("round-trips an optional PKCE code verifier", () => {
    const token = createWearableState({ athleteId: "a1", provider: "garmin", locale: "en", nonce: "n1", codeVerifier: "verifier-123" }, secret, now);
    expect(verifyWearableState(token, secret, now)?.codeVerifier).toBe("verifier-123");
  });

  it("rejects malformed / empty tokens", () => {
    expect(verifyWearableState(undefined, secret, now)).toBeNull();
    expect(verifyWearableState("", secret, now)).toBeNull();
    expect(verifyWearableState("nodot", secret, now)).toBeNull();
  });
});
