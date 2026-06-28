# Wearable OAuth connect flow (Oura)

Completes the OAuth2 authorization-code round-trip that connects a wearable and
persists an encrypted `device_connections` record. Oura is the first live
provider; the same flow generalizes to Whoop/Garmin (separate issues).

## Sequence

```
Athlete                Wearables page         API                         Oura
  | click "Connect"        |                   |                            |
  |----------------------->| POST /athletes/[id]/devices {source:"oura"}    |
  |                        |------------------>| build signed CSRF state    |
  |                        |                   | set httpOnly state cookie  |
  |                        |<------------------| { authUrl }                |
  | redirect to authUrl ------------------------------------------------->  |
  |                        |                   |         user authorizes    |
  | <----------- 302 to /api/oauth/wearable/callback?code&state ----------  |
  |                        |   GET callback    |                            |
  |                        |                   | verify state (cookie==query, sig, exp)
  |                        |                   | exchange code -> tokens --->|
  |                        |                   |<-- access/refresh/expiry ---|
  |                        |                   | encrypt + upsert connection |
  |                        |                   | clear state cookie          |
  | <--- 302 /{locale}/dashboard/wearables?connected=oura (or ?error=) ---  |
```

## CSRF state

`lib/wearable-oauth-state.ts` — the `state` is an HMAC-signed payload
(`{athleteId, provider, locale, nonce, exp}`, signed with `AUTH_SECRET`, 10-min
TTL). It travels in both the provider redirect (`state` query) and an httpOnly
`wearable_oauth_state` cookie (SameSite=Lax so it survives the top-level
redirect back). The callback requires both, that they match (double-submit), and
a valid signature + unexpired `exp`; it then clears the cookie (single-use).

## Callback contract (`GET /api/oauth/wearable/callback`)

| Condition                         | Result |
|-----------------------------------|--------|
| `OURA_CLIENT_ID/SECRET` unset     | `501` (config gap, not a crash) |
| Provider returned `error=...`     | `302 …?error=consent_denied` |
| Missing `code` or `state`         | `400` |
| Bad / expired / mismatched state  | `403`, no record |
| Token exchange failed             | `302 …?error=exchange_failed`, no record |
| Success                           | `302 …?connected=oura`, one connection upserted |

Tokens are encrypted at rest (`lib/wearable-token-crypto.ts`), decrypted
in-memory only, and never logged or returned. Observability events
`wearable.oauth.exchange.{started,succeeded,failed}` carry a correlationId and
provider but never the code or tokens.

## Configuration

See `.env.example`: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `OURA_API_BASE_URL`.
Register `{APP_BASE_URL}/api/oauth/wearable/callback` as the Oura redirect URI.

## Status & limitations

- State signing/verification, callback routing/validation, token-response
  handling, encryption, and persistence are unit-tested (live exchange mocked).
- The live token exchange requires real Oura credentials + a sandbox account to
  verify end-to-end; without configuration the callback returns `501`.
- Telemetry sync after connect is `docs/wearable-sync.md` (#349).

## Rollback

Revert the commit. Additive only (connection rows). The previous `501` stub is
restored by the revert; no schema migration.
