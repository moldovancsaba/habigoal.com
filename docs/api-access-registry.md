# API Access Registry

The API access registry lives in `lib/api-access-registry.ts`.

It classifies every `app/api/**/route.ts` handler by access class, product surface, persona scope, allowed HTTP methods, denial codes, guard contract, observability events, timeout budget, and rollback behavior.

## Route Classes

- `public`: no session required; must include a public justification and must not read protected data.
- `auth_required`: signed-in shared utility endpoint; product-specific reads still happen inside the service contract.
- `habigoal_user`: Habigoal-only endpoint; requires Habigoal entitlement and self scope.
- `athlete_iq_athlete`: Athlete IQ endpoint for athlete/self or scoped athlete reads and writes.
- `athlete_iq_trainer`: Athlete IQ professional endpoint for assigned athletes, teams, or organization scope.
- `admin`: admin-only operational endpoint.
- `webhook_signed`: external provider or partner endpoint protected by signature or API key.
- `cron_secret`: scheduled endpoint protected by `CRON_SECRET`.
- `internal`: server/operator endpoint that must not become public product behavior.

## How To Add A Route

1. Add the route handler.
2. Add or extend one registry rule in `lib/api-access-registry.ts`.
3. Use the matching guard contract:
   - `requireHabigoalApiUser`
   - `requireAthleteIqApiUser`
   - `requireAthleteIqTrainerApiUser`
   - `requireAdminApiUser`
4. Keep errors structured with denial codes and correlation ids where the route family supports them.
5. Do not log raw emails, tokens, notes, provider payloads, or raw athlete ids.
6. Run `npm run api-access:audit`.

## Release Behavior

`npm run api-access:audit` fails when a route is unclassified or exports a method not allowed by its contract. Missing registry entries must be fixed by adding the correct contract, not by weakening the audit.

Rollback is route-family specific: disable or revert the affected endpoint while keeping product entitlement, persona, signature, cron, or admin guards enforced.
