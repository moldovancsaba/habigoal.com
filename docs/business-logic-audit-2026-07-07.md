# Business Logic Audit - 2026-07-07

Code state audited: `bb563439f3ad4d402582baca8895bd9ce204e008`

This audit maps the business logic currently implemented in the repository, then identifies confirmed leaks, boundary failures, threats, and remediation order. It focuses on the three product personas:

- Habigoal habit builder at `/habigoal`
- Athlete IQ athlete workspace at `/athlete-iq?persona=athlete`
- Athlete IQ trainer workspace at `/athlete-iq?persona=trainer`

## Executive Summary

The product contracts in code describe the correct business model, but enforcement is inconsistent below the page layer.

The page routes use `requireProductSession` and are mostly aligned with the intended separation. The API layer is not aligned. Several API guards trust client-provided headers, many Athlete IQ APIs check only athlete scope and not Athlete IQ product entitlement, and some device/wearable routes are effectively public. These defects explain why old or mixed product behavior can reappear even after UI cleanup: the lower-level services still allow cross-surface behavior.

The highest-risk findings are:

1. API role escalation through the client-controllable `x-habigoal-role` header.
2. Production-fatal open-auth behavior when `HABIGOAL_ENFORCE_AUTH` is missing or false.
3. Public wearable/device endpoints that can read metadata, start connection flows, revoke connections, or accept health-sync payloads without a session.
4. Missing Athlete IQ entitlement gates across most `/api/athleteiq/*` endpoints.
5. Local persona login can self-provision Athlete IQ trainer or athlete entitlement based on a submitted persona.
6. Signed-but-readable session and OAuth state payloads carry sensitive tokens or PKCE verifier material.

## Implemented Business Model

### Habigoal

Canonical contract:

- Independent white-label habit builder for any signed-in person.
- Does not require Athlete IQ access.
- Writes personal daily check-in and habit records.
- Must not render Athlete IQ trainer UI, team UI, professional modules, or AIQ function cards.

Relevant code:

- Page route: `app/[locale]/habigoal/page.tsx:33` calls `requireProductSession(...)`.
- Contract: `lib/product-apps.ts:48-90` defines Habigoal as product surface `habigoal`, route `/habigoal`, allowed roles, forbidden Athlete IQ shell markers, and `dailyStatus: "write-personal"`.
- Surface contract: `lib/product-surfaces.ts:346-401` defines Habigoal as independent habitbuilder and limits function ids to `hbg-*`.
- Service: `services/habigoal-product.service.ts:188-201` resolves only the signed-in user's own Habigoal athlete-compatible profile and can create a personal profile.
- Write API: `app/api/habigoal/daily-operation/route.ts:24-32` requires authenticated user plus Habigoal entitlement.
- Shared state service: `services/shared-daily-state.service.ts:183-187` lets Habigoal create/use the signed-in user's own profile only.

Assessment:

- The page and primary Habigoal write path match the business requirement.
- Habigoal still writes into shared Athlete IQ-compatible data stores by design. That is acceptable only when UI, entitlement, and projection boundaries remain strict.

### Athlete IQ Athlete

Canonical contract:

- Professional Athlete IQ access for an athlete.
- Can see only own performance context.
- Can write/read own Athlete IQ daily status and modules where entitled.
- Must not see trainer/team management controls.

Relevant code:

- Page route: `app/[locale]/athlete-iq/page.tsx:37-40` resolves athlete/trainer persona, calls `requireProductSession(...)`, then loads dashboard projection.
- Contract: `lib/product-apps.ts:91-132` defines `athlete-iq-athlete` with product surface `athlete-iq`, forbidden Habigoal shell markers, and `dailyStatus: "read-write-own-athlete"`.
- Dashboard projection: `services/athleteiq-product-dashboard.service.ts:82-95` resolves effective persona only when the user actually holds the role.

Assessment:

- The page route is aligned.
- Most direct Athlete IQ APIs are not aligned because they do not enforce Athlete IQ entitlement before reading/writing AIQ data.

### Athlete IQ Trainer

Canonical contract:

- Professional command surface for trainers, staff, club management, and admins.
- Can manage and support assigned athletes only.
- Can read Habigoal-created daily records only as authorized shared data.
- Must never embed Habigoal habitbuilder UI or publish Habigoal functions as trainer modules.

Relevant code:

- Contract: `lib/product-apps.ts:133-174` defines trainer-only roles, Athlete IQ surface, `aiq-*` functions, and `dailyStatus: "read-team"`.
- Team scoping: `lib/access.ts:105-124` resolves accessible athlete ids by role, team assignment, trainer email, athlete id, or parent athlete ids.
- Dashboard service: `services/athleteiq-product-dashboard.service.ts:247-280` filters teams, athletes, and actions by allowed athlete ids and team membership.
- Team management service: `services/team-invitation.service.ts:30-37` requires admin or team manager ownership.

Assessment:

- Team scoping exists and is directionally correct.
- Several APIs still rely on the spoofable `requireRole` helper, so role correctness is not trustworthy until that helper is fixed.

## Data Flow Map

### Identity and Auth

- `middleware.ts:169-170` skips all `/api` routes.
- `middleware.ts:173-175` allows page access without auth when `HABIGOAL_ENFORCE_AUTH` is not exactly `"true"`.
- `config/env.ts:26` defaults `habigoalEnforceAuth` to `false`.
- `lib/access.ts:59-72` returns a dev admin/trainer/athlete with both product entitlements when auth enforcement is off.
- `app/api/auth/login/route.ts:123-228` supports local persona login and provisions users.
- `app/api/oauth/callback/route.ts:71-112` uses SSO allow-list behavior, with first-user admin bootstrap at `91-101`.

### Product Entitlements

- `lib/product-entitlements.ts:46-57` creates self-registered Habigoal-only entitlement.
- `lib/product-entitlements.ts:85-107` resolves requested persona/product entitlements at login.
- `lib/product-entitlements.ts:100-102` grants Athlete IQ athlete entitlements when requested surface is `athlete-iq` and requested role includes `athlete`.
- `lib/product-entitlements.ts:148-170` grants professional Athlete IQ entitlements when requested professional roles are supplied for Athlete IQ.
- `repositories/user.repository.ts:91-130` merges requested roles and writes the resolved entitlements during persona login.

### Shared Daily State

- `services/shared-daily-state.service.ts:52-113` reads shared daily projection from Athlete IQ check-ins plus Habigoal habit records.
- `services/shared-daily-state.service.ts:115-156` writes check-in and habit records.
- `services/shared-daily-state.service.ts:164-195` enforces surface-specific athlete resolution.
- `app/api/habigoal/daily-operation/route.ts:59-87` writes Habigoal daily state and triggers mirrored Athlete IQ daily engine runs.
- `app/api/daily-state/route.ts:8-99` exposes a shared state API for both products and delegates product/athlete authorization to the service.

### Team and Athlete Scope

- `lib/access.ts:105-124` grants:
  - admin, club management, analyst: all athletes
  - athlete: own `athleteId`
  - parent: `parentAthleteIds`
  - trainer/staff: athletes in teams by trainer email or assigned team id
- `lib/access.ts:136-140` evaluates a specific athlete id against that list.
- `services/team-invitation.service.ts:30-37` defines team management ownership.

### Wearables and External Ingest

- `app/api/athletes/[id]/devices/route.ts:20-93` lists device connections and starts wearable OAuth.
- `app/api/oauth/wearable/callback/route.ts:22-96` exchanges wearable OAuth codes and stores encrypted tokens.
- `lib/wearable-token-crypto.ts:1-45` encrypts wearable tokens.
- `app/api/performance/vald/webhook/route.ts:26-77` verifies VALD webhook signatures and writes raw/canonical metrics.
- `app/api/cron/queue/route.ts:14-27` drains queue jobs with bearer `CRON_SECRET`.

## Findings

### BL-001 - Critical - Client-controllable role header can escalate API privileges

Evidence:

- `lib/api.ts:7` defines `ROLE_HEADER = "x-habigoal-role"`.
- `lib/api.ts:31-43` reads that request header before falling back to the session.
- `lib/api.ts:59-66` repeats the same pattern for capability checks.
- `middleware.ts:169-170` skips all API routes, so APIs do not receive a trusted middleware-normalized identity.
- `middleware.ts:147-155` copies inbound request headers for page requests and sets product headers; it does not strip `x-habigoal-role`.
- Many protected APIs rely on `requireRole`, for example `app/api/users/route.ts`, `app/api/admin/actions/route.ts`, `app/api/teams/route.ts`, `app/api/uploads/imgbb/route.ts`, and others listed by `rg "requireRole\\(" app/api`.

Threat:

An attacker can send a request with `x-habigoal-role: admin` or `x-habigoal-role: trainer` to API routes using `requireRole`. If auth enforcement is on, the route may trust the header as the role source. This can bypass session role checks.

Business impact:

- Unauthorized admin actions.
- Unauthorized user and team management.
- Unauthorized media upload proxy use.
- Unauthorized read/write access to athlete, assessment, training, settings, queue, report, and admin endpoints that rely on `requireRole`.

Root cause:

Role resolution is split between request headers and session/user lookup. The role header is treated as trusted without a trust boundary.

Required fix:

1. Remove client header role trust from `requireRole` and `requireCapability`.
2. Resolve roles only from `getAuthUser()` or a server-created internal identity context.
3. Strip inbound `x-habigoal-role` and other security-sensitive `x-habigoal-*` headers at the edge before app code sees them.
4. Add regression tests that prove `x-habigoal-role: admin` cannot satisfy admin routes.

### BL-002 - Critical - Auth defaults fail open and dev admin can become production behavior

Evidence:

- `config/env.ts:26` defaults `habigoalEnforceAuth` to `false`.
- `lib/access.ts:59-72` returns a dev user with roles `["admin", "trainer", "athlete"]` and both product entitlements when auth is not enforced.
- `lib/api.ts:31-33` disables `requireRole` when auth is not enforced.
- `middleware.ts:173-175` skips protected page checks when auth env is not exactly `"true"`.
- README says production should use `HABIGOAL_ENFORCE_AUTH=true`, but code does not enforce that invariant.

Threat:

If `HABIGOAL_ENFORCE_AUTH` is absent, misspelled, false, or overwritten in production, the application acts as an admin/trainer/athlete dev session and API guards return success.

Business impact:

- Full professional and admin data exposure.
- Unauthorized writes to athlete and team records.
- False confidence because the UI can appear logged in and functional while auth is disabled.

Root cause:

Development open mode is implemented in production runtime helpers instead of being isolated to local-only code paths.

Required fix:

1. Fail closed when `NODE_ENV === "production"` and `HABIGOAL_ENFORCE_AUTH !== "true"`.
2. Remove dev admin from `getAuthUser()` or gate it behind an explicit local-only flag that cannot run on production hosts.
3. Add startup/build validation for `AUTH_SECRET`, `HABIGOAL_ENFORCE_AUTH`, SSO config, and MongoDB config.
4. Add a deployment smoke test that asserts unauthenticated personal-data APIs return 401/403 in production.

### BL-003 - Critical - Device and health sync endpoints allow unauthenticated operations

Evidence:

- `app/api/athletes/[id]/devices/route.ts:26-29` allows device list read when `getAuthUser()` returns `null`; the denial only runs when `user` exists and cannot access the athlete.
- `app/api/athletes/[id]/devices/route.ts:52-55` repeats the same pattern for starting wearable OAuth.
- `app/api/athletes/[id]/devices/[connectionId]/route.ts:4-17` revokes a connection by `connectionId`; line `10` is a placeholder comment and there is no auth check.
- `app/api/athletes/[id]/devices/health-sync/route.ts:4-17` accepts a POST payload without any auth, signature, device binding, or product entitlement.

Threat:

Unauthenticated callers can enumerate safe connection metadata for an athlete id, start OAuth connection flows, revoke a connection by id, and send spoofed mobile health payloads.

Business impact:

- Privacy leak of device connection metadata.
- Denial of service against wearable integrations.
- Potential false data ingestion path if the placeholder health-sync route is later wired to persistence.

Root cause:

Routes use optional authorization checks instead of mandatory authentication and athlete ownership checks. Some placeholder code remained live.

Required fix:

1. Require authenticated user on every device method.
2. Require `canAccessAthlete(user, athleteId)` and relevant product/capability checks before any read or write.
3. For deletion, load the connection and verify it belongs to both the path athlete id and actor scope before revoking.
4. Remove or hard-disable `health-sync` until it has signed device requests, replay protection, source validation, persistence contract, and observability.

### BL-004 - Critical - Athlete IQ APIs often miss Athlete IQ entitlement checks

Evidence:

The page route enforces product entitlement at `app/[locale]/athlete-iq/page.tsx:39`. Several API routes do not. Examples:

- `app/api/athleteiq/calendar/day/route.ts:10-20` authenticates and checks athlete access, but does not call `canOpenProductSurface(user, "athlete-iq")`.
- `app/api/athleteiq/daily-plan/today/route.ts:9-18` authenticates and checks athlete access, but not Athlete IQ entitlement.
- `app/api/athleteiq/modules/route.ts:9-28` returns Athlete IQ module registry for authenticated users without product entitlement check.
- `app/api/athleteiq/check-ins/route.ts:14-29` writes Athlete IQ check-ins and shared mirrors without product entitlement check.
- `app/api/athleteiq/sessions/route.ts:13-31` reads AIQ sessions, and `41-60` creates AIQ sessions, without product entitlement check.

Pattern scan found the same issue in most `/api/athleteiq/*` route handlers, including:

- `athleteiq/athletes/[id]/twin`
- `athleteiq/calendar/*`
- `athleteiq/check-ins/*`
- `athleteiq/daily-iq/*`
- `athleteiq/daily-plan/*`
- `athleteiq/lite-modules`
- `athleteiq/modules`
- `athleteiq/pain-*`
- `athleteiq/readiness-route/*`
- `athleteiq/reflections/*`
- `athleteiq/reports/daily/*`
- `athleteiq/sessions/*`
- `athleteiq/wearables/manual-entry`

Threat:

A Habigoal-only self-registered user can have an athlete profile and pass `canAccessAthlete` for their own athlete id. Without a product entitlement check, direct API calls can access or mutate Athlete IQ data even when the user should not have Athlete IQ access.

Business impact:

- Product-boundary leak between Habigoal and Athlete IQ.
- Unauthorized AIQ data generation, sessions, plans, reports, modules, and projections.
- UI can be correct while APIs remain wrong, creating inconsistent product behavior.

Root cause:

Athlete scope and product entitlement are treated as equivalent in API code. They are not equivalent.

Required fix:

1. Add a single API helper: `requireProductApiAccess(request, "athlete-iq")` returning authenticated user plus entitlement.
2. Replace direct `getAuthUser()` usage in Athlete IQ APIs with the helper.
3. Use `canAccessAthleteIqAthlete` for athlete-specific AIQ data instead of bare `canAccessAthlete`.
4. Add contract tests that a Habigoal-only user receives `PRODUCT_ACCESS_DENIED` from every `/api/athleteiq/*` route.

### BL-005 - High - Persona login can self-provision Athlete IQ access

Evidence:

- `app/api/auth/login/route.ts:123-159` accepts email plus persona and calls `upsertPersonaLoginUser`.
- `app/api/auth/login/route.ts:153` assigns `["trainer", "athlete"]` when persona is `"trainer"`.
- `repositories/user.repository.ts:91-130` merges requested roles with existing roles and writes entitlements.
- `lib/product-entitlements.ts:100-102` grants Athlete IQ athlete entitlement for requested surface `athlete-iq` and requested role `athlete`.
- `lib/product-entitlements.ts:154-170` grants Athlete IQ entitlement for requested professional roles.

Threat:

If local persona login is reachable in production, any valid email can request trainer persona and receive trainer/athlete roles plus Athlete IQ entitlement.

Business impact:

- Unauthorized professional user creation.
- Self-service escalation into trainer workspace.
- Potential creation of a personal athlete profile and use of professional APIs.

Root cause:

Self-registration and professional provisioning are mixed in the same login path.

Required fix:

1. Separate Habigoal self-registration from Athlete IQ provisioning.
2. For Athlete IQ trainer access, require SSO allow-list, admin invitation, team invitation, or pre-existing entitlement.
3. For Athlete IQ athlete access, require team invitation, professional membership grant, or admin grant.
4. Make `upsertPersonaLoginUser` unable to grant professional roles from untrusted login input.

### BL-006 - High - Session JWT is signed but not encrypted and can contain OAuth access token

Evidence:

- `lib/session.ts:12-20` defines `accessToken?: string` in session payload.
- `lib/session.ts:27-32` uses `SignJWT`, which signs but does not encrypt payload.
- `lib/session.ts:46-56` stores `accessToken` into the cookie payload when provided.
- `app/api/oauth/callback/route.ts:121-127` passes `tokens.access_token` into `createSession`.

Threat:

The session cookie is `httpOnly`, but the JWT payload is base64url-readable by anyone who obtains the cookie value through browser compromise, logs, proxies, support tooling, or client-side exfiltration. The access token should not be present in a readable cookie payload.

Business impact:

- SSO access token disclosure.
- Expanded blast radius if a session cookie leaks.
- Misleading function name `encrypt` may hide the risk during review.

Root cause:

Session integrity and session confidentiality are treated as the same thing.

Required fix:

1. Do not store OAuth access tokens in the session cookie.
2. Store provider tokens server-side, encrypted with required production key material.
3. Rename `encrypt`/`decrypt` to `signSession`/`verifySession` unless using real JWE encryption.
4. Rotate `AUTH_SECRET` after removing token-in-cookie behavior if any production cookies may have contained tokens.

### BL-007 - High - Wearable OAuth state leaks PKCE verifier in URL-visible state

Evidence:

- `app/api/athletes/[id]/devices/route.ts:73-78` creates PKCE data, stores `codeVerifier` inside `createWearableState(...)`, and sends the same `state` to `oauth.buildAuthorizeUrl(...)`.
- `lib/wearable-oauth-state.ts:33-45` serializes the whole binding, including optional `codeVerifier`, into a signed base64url payload.
- `lib/wearable-oauth-state.ts:20-22` comments say the verifier is carried in the httpOnly cookie only, but the implementation sends it in the `state` query value too.
- `app/api/oauth/wearable/callback/route.ts:64` later uses `binding.codeVerifier` to exchange the auth code.

Threat:

PKCE verifier material is exposed in the OAuth state URL because the state is signed, not encrypted. URLs can be stored in browser history, provider logs, reverse proxies, analytics, support screenshots, and referrers.

Business impact:

- Reduced PKCE protection for wearable integrations.
- Token exchange risk if the authorization code and state/verifier are both exposed.

Root cause:

State integrity was implemented, but confidentiality was assumed incorrectly.

Required fix:

1. Put only a nonce in URL state.
2. Store verifier server-side or in an httpOnly cookie keyed by nonce.
3. Verify query state equals nonce, then read verifier from server-side/cookie storage.
4. Update tests to assert decoded state never contains `codeVerifier`.

### BL-008 - High - Wearable token encryption has known fallback secret

Evidence:

- `lib/wearable-token-crypto.ts:4` uses `process.env.AUTH_SECRET || "default_dev_secret_must_be_32_bytes_long_12345"`.
- `lib/wearable-token-crypto.ts:7-14` derives AES key material from that value.
- `app/api/oauth/wearable/callback/route.ts:81-82` encrypts wearable access and refresh tokens with this helper.

Threat:

If `AUTH_SECRET` is missing in any deployed environment, wearable tokens are encrypted with a public, repository-known fallback.

Business impact:

- Wearable access and refresh tokens become decryptable by anyone with database access or leaked token rows.
- False sense of security because values appear encrypted.

Root cause:

Secret material has a development fallback in production code.

Required fix:

1. Replace fallback with `requireServerEnv("authSecret")`.
2. Fail token encryption/decryption when no secret is configured.
3. Rotate existing wearable tokens after the fix.
4. Add a test that missing `AUTH_SECRET` throws.

### BL-009 - High - OAuth login state uses weak randomness

Evidence:

- `app/api/auth/login/route.ts:101` uses `Math.random().toString(36).substring(7)` for OAuth state.
- `app/api/oauth/callback/route.ts:63-65` treats that state as the CSRF boundary.

Threat:

OAuth state should be cryptographically random. `Math.random` is not suitable for auth CSRF protection and may produce short state values.

Business impact:

- Weak login CSRF protection.
- Increased risk of session confusion in auth flows.

Root cause:

Convenience random string generation was used for an auth security boundary.

Required fix:

1. Use `crypto.randomUUID()` or `crypto.getRandomValues`/`randomBytes`.
2. Include nonce and expiry.
3. Make callback comparison constant-time where practical.

### BL-010 - Medium - API error responses expose internal exception messages

Evidence:

Many Athlete IQ APIs pass raw exception messages to clients:

- `app/api/athleteiq/calendar/day/route.ts:25-26`
- `app/api/athleteiq/daily-plan/today/route.ts:22-23`
- `app/api/athleteiq/modules/route.ts:40-41`
- `app/api/athleteiq/check-ins/route.ts:73-74`
- `app/api/athleteiq/sessions/route.ts:30-31` and `59-60`
- Pattern scan found the same shape in many more `/api/athleteiq/*` handlers.

Threat:

Internal error messages can expose collection names, provider errors, data assumptions, ids, stack-adjacent details, or validation internals.

Business impact:

- Information disclosure.
- Harder operational triage because clients receive ungoverned error text instead of stable codes.

Root cause:

Structured error helper supports details, but routes pass raw `Error.message` by default.

Required fix:

1. Return stable codes and correlation ids to clients.
2. Log internal messages server-side only, with privacy redaction.
3. Use a shared `unknownServerError(correlationId)` helper.
4. Add tests that 500 responses do not expose thrown error text.

### BL-011 - Medium - Observability leaks raw athlete ids despite privacy contract

Evidence:

- `lib/business-logic-contracts.ts:249-252` says observability should use correlation ids and hashed identifiers, not sensitive identifiers.
- `app/api/athleteiq/calendar/day/route.ts:23` logs raw `athleteId`.
- `app/api/athleteiq/check-ins/route.ts:45` logs raw `snapshot.athleteId`.
- `app/api/athleteiq/sessions/route.ts:28` and `57` log raw `athleteId`.
- `app/api/oauth/wearable/callback/route.ts:59` and `90` log raw `binding.athleteId`.
- `app/api/athletes/[id]/devices/health-sync/route.ts:17` logs raw path athlete id.

Threat:

Application logs become a personal-data store containing raw athlete identifiers.

Business impact:

- Privacy and data-processing risk.
- Wider blast radius for log access.
- Contract breach against the repository's own operational rule.

Root cause:

Some APIs use privacy-safe hash helpers, while many Athlete IQ routes manually log raw ids.

Required fix:

1. Centralize `hashForLog` in a shared logging helper.
2. Replace raw athlete/user/team identifiers in logs with hashed ids unless a formally approved audit event requires raw ids.
3. Add lint/static tests for `console.* athleteId`.

### BL-012 - Medium - Public/product metadata APIs are intentionally open but not clearly classified

Evidence:

- Public or ungated routes include `app/api/product-surfaces/*`, `app/api/openapi/route.ts`, `app/api/capabilities/route.ts`, and `app/api/ai/models/route.ts`.
- `app/api/product-surfaces/[surface]/functions/route.ts` and navigation routes expose registry-level product structure.

Threat:

This is not automatically a defect. Public product metadata can be acceptable. The risk is that open endpoints are not formally classified and could later include role-sensitive module availability, roadmap, or operational flags.

Business impact:

- Product intelligence disclosure.
- Easier enumeration of feature surfaces.

Root cause:

No route-level public/private classification registry exists.

Required fix:

1. Add an API route classification table: public metadata, authenticated user, product-entitled, staff, admin, secret webhook.
2. Add tests that every route is classified.
3. Keep public metadata free of user, entitlement, internal roadmap, and environment-specific data.

### BL-013 - Medium - Consent is stated as a trainer access boundary but not visible in core team access checks

Evidence:

- Business contracts state trainer access to Habigoal-created daily-status history requires entitlement, assignment, and consent.
- `lib/access.ts:105-124` resolves athlete access by roles/team assignments, but does not check consent.
- `services/athleteiq-product-dashboard.service.ts:109-123` scopes trainer dashboard data by accessible athlete ids and teams, not consent.
- Consent APIs exist under `app/api/athletes/[id]/consents/*`, but the core projection paths do not visibly require active consent.

Threat:

Team assignment alone may expose daily-status data that business contracts say should require consent.

Business impact:

- Partner trust and legal/data-sharing risk.
- Athlete expectations not enforced in professional projections.

Root cause:

Consent exists as records and endpoints but is not part of the central athlete-data authorization contract.

Required fix:

1. Define which data categories require consent: daily status, habits, check-ins, wearable, reports, reflections, medical/safety.
2. Add a central `canReadAthleteData(user, athleteId, dataCategory)` helper.
3. Use it in trainer/team projections and shared daily-status reads.
4. Add tests for revoked/missing consent.

### BL-014 - Medium - Admin/governance paths inherit the role-header bypass

Evidence:

- `app/api/admin/actions/route.ts:13-18` uses `requireRole(request, ["admin"])`, then `getAuthUser()`.
- `app/api/admin/actions/route.ts:32-49` performs audit-first role mutation.
- `app/api/admin/queue/*` also uses `requireRole(request, ["admin"])`.

Threat:

The governance action implementation itself is careful, but its first gate can be bypassed by BL-001.

Business impact:

- Unauthorized role grants/revocations.
- Unauthorized queue processing/retry operations.

Root cause:

Good local admin action code depends on unsafe shared auth helper.

Required fix:

Same fix as BL-001, plus add admin route tests with spoofed role headers.

### BL-015 - Medium - Route/API protection is duplicated and inconsistent

Evidence:

- Page protection: `app/[locale]/habigoal/page.tsx:33`, `app/[locale]/athlete-iq/page.tsx:39`.
- Middleware protection: `middleware.ts:166-228`, but APIs are skipped at `169-170`.
- API helpers: `lib/api.ts:31-72`, `lib/access.ts:59-160`.
- Many APIs use `requireRole`; many other APIs use `getAuthUser`; product APIs use different patterns per handler.

Threat:

Every new API can accidentally choose a weaker pattern. Product UI can be correct while backend permissions drift.

Business impact:

- Regression risk.
- Low delivery predictability.
- Ongoing "old stuff appears" behavior because root boundaries are not centralized.

Root cause:

There is no single product-aware API authorization contract.

Required fix:

1. Create centralized helpers:
   - `requireHabigoalApiUser()`
   - `requireAthleteIqApiUser()`
   - `requireStaffApiUser()`
   - `requireAdminApiUser()`
   - `requireWebhookSecret()`
2. Return `{ user, correlationId }` from product-aware helpers.
3. Ban direct `requireRole` and direct `getAuthUser` in route handlers except inside those helpers.
4. Add static tests enforcing the new pattern.

## Route Risk Matrix

### Must Fix First

- All `requireRole(...)` routes until BL-001 is fixed.
- `app/api/athletes/[id]/devices/route.ts`
- `app/api/athletes/[id]/devices/[connectionId]/route.ts`
- `app/api/athletes/[id]/devices/health-sync/route.ts`
- Most `app/api/athleteiq/**/route.ts` handlers missing Athlete IQ product entitlement checks.
- `app/api/auth/login/route.ts`
- `lib/session.ts`
- `lib/wearable-oauth-state.ts`
- `lib/wearable-token-crypto.ts`

### Acceptable Public or Secret-Gated With Conditions

- `app/api/health/route.ts`: acceptable if no secrets or personal data are exposed.
- `app/api/openapi/route.ts`: acceptable if public contract only.
- `app/api/product-surfaces/*`: acceptable if metadata only and route classification exists.
- `app/api/cron/queue/route.ts`: secret-gated and fail-closed when `CRON_SECRET` missing.
- `app/api/performance/vald/webhook/route.ts`: signature-gated and fail-closed when secret missing, but should keep raw ids out of logs and validate replay/idempotency explicitly.
- `app/api/content-intelligence/publish-reviewed/route.ts`: bearer-gated, but should use constant-time comparison and fail closed when token is unset.

## Delivery Recommendation

### Phase 0 - Immediate Containment

1. Confirm production `HABIGOAL_ENFORCE_AUTH=true` and `AUTH_SECRET` configured.
2. Strip or reject inbound `x-habigoal-role` at the edge.
3. Disable unauthenticated wearable/device routes if a code fix cannot ship immediately.
4. Stop storing new SSO access tokens in session cookies.

### Phase 1 - Central Authorization Refactor

1. Replace `requireRole` and `requireCapability` internals with session-backed `getAuthUser`.
2. Add product-aware API guard helpers.
3. Convert all Athlete IQ APIs to `requireAthleteIqApiUser`.
4. Convert Habigoal APIs to `requireHabigoalApiUser`.
5. Add route classification tests for every `app/api/**/route.ts`.

### Phase 2 - Product Boundary Closure

1. Remove self-provisioned Athlete IQ professional grants from local persona login.
2. Require invitation/admin/SSO grant for Athlete IQ athlete and trainer entitlement.
3. Add explicit consent-aware data-category checks for professional reads.
4. Add tests proving Habigoal-only users cannot call Athlete IQ APIs.

### Phase 3 - Secrets, Tokens, and Observability

1. Move OAuth access tokens out of signed cookies.
2. Remove wearable token fallback secret.
3. Redesign wearable PKCE state so verifier is not URL-visible.
4. Remove raw exception messages from API responses.
5. Replace raw ids in operational logs with hashes.

### Phase 4 - Regression Harness

1. Test spoofed role headers against admin, trainer, and athlete APIs.
2. Test auth-off production configuration fails at startup.
3. Test every product route and API with:
   - unauthenticated user
   - Habigoal-only user
   - AIQ athlete
   - AIQ trainer
   - admin
4. Test public metadata routes expose no personal data or entitlement data.

## Definition of Done for Remediation

A remediation is complete only when:

- No API authorization depends on client-provided role headers.
- Production cannot start with auth disabled.
- A Habigoal-only account cannot access any Athlete IQ API or function registry.
- Athlete IQ trainer APIs enforce product entitlement, role, team/assignment, and consent/data-category boundaries.
- Wearable/device APIs require authenticated athlete scope and cannot be called anonymously.
- Session cookies contain no provider access tokens.
- PKCE verifier material is never present in URL-visible state.
- API 500 responses do not expose raw exception messages.
- Logs use correlation ids and hashed identifiers.
- Static route classification covers every `app/api/**/route.ts`.
- Regression tests prove all of the above.

