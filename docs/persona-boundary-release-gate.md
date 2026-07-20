# Persona Boundary Release Gate

The persona boundary gate is `npm run persona-boundary:audit`.

It protects the three app experiences:

- Habigoal at `/{locale}/habigoal`
- Athlete IQ athlete at `/{locale}/athlete-iq?persona=athlete`
- Athlete IQ trainer at `/{locale}/athlete-iq?persona=trainer`

## What It Checks

- API authorization does not trust client role headers.
- Athlete IQ direct APIs use Athlete IQ product auth.
- API route classes exist in `lib/api-access-registry.ts`.
- Session and OAuth payloads do not carry provider tokens or URL-visible PKCE verifiers.
- Untrusted health-sync ingest stays disabled until a signed device contract exists.
- API JSON telemetry does not log raw athlete ids.
- Persona login cannot self-grant Athlete IQ access.
- Consent decisions filter professional trainer reads of shared daily-state data.
- The public partner contract page is wired to current code contracts and GDS primitives.
- GDS, product-boundary, persona-UI, and API-access audit commands are available for release proof.

## Report

The script writes `.audit-reports/persona-boundary-report.json` with pass/fail cases and failure reasons. The directory is ignored because it is generated evidence, not source.

## Triage

If the gate fails, fix the failing boundary directly:

- Missing route classification: update `lib/api-access-registry.ts`.
- Product bypass: use the correct product API principal helper.
- Consent leak: filter by `resolveConsentDecisions`.
- Raw identifier logging: log a hash, not the raw identifier.
- UI leakage: fix the product app contract or GDS component use, then run the UI audits.

Do not bypass the gate to ship mixed Habigoal, Athlete IQ athlete, or Athlete IQ trainer behavior.
