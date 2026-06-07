# ClassScout 2.0 Architecture Boundary

ClassScout is a parent-directed AI activity concierge. It helps a parent discover and evaluate youth activities from public/provider listing data and parent-managed household preferences. It is not a child social network, medical product, school-record system, therapy/diagnosis workflow, behavioral advertising product, or child/household data resale channel.

## Runtime Flow

1. Public or provider activity sources enter the ingestion pipeline.
2. Ingestion produces structured activity candidates and source confidence metadata.
3. Human review approves or rejects low-confidence candidates before public projection.
4. Approved activity data feeds search and recommendation candidate generation.
5. Parent accounts own households, child activity profiles, preferences, privacy requests, and feedback history.
6. Parent onboarding collects household, profile, interest, constraint, optional history, and consent inputs through GDS-only UI backed by centralized state contracts.
7. Recommendation services consume only normalized, parent-managed preferences and redacted participation signals after active parent consent is present.
8. Provider workflows can claim and update listings, but never receive child profile data or household identity.
9. Privacy operations export, delete, withdraw consent, and audit parent-managed profile data without logging sensitive note values.

## Actor Boundaries

- Parent: owns household preferences, child activity profiles, privacy requests, and participation signals.
- Child: has no independent account in MVP. Child data is parent-managed and not public.
- Provider: owns public listing claim/update workflows only. Provider access excludes child, household, support-note, and feedback data.
- Operator: reviews listing quality and recoverable operational failures. Privileged sensitive-note access requires a reason code and audit event.

## Prohibited Behavior

- Independent under-13 child credentials or direct messaging.
- Public child profiles or child-to-child networking.
- Clinical, therapeutic, diagnostic, school-record, FERPA, or medical workflows.
- Behavioral advertising, household data resale, or provider exposure of child profile data.
- Local/demo/offline persistence fallback that bypasses production authorization or data rules.
- Non-GDS UI systems, local visual token authority, or page-local frontend primitives.

## Module Map

- `lib/classscout/contracts.ts`: central ClassScout actor, runtime state, route, profile, preference, redaction, and service-result contracts.
- `lib/classscout/profile-service.ts`: parent-scoped profile and preference service with validation, redaction, deletion flags, bounded timeouts, bounded retries, and privacy-safe audit events.
- `lib/classscout/profile-service.test.ts`: unit coverage for normalization, redaction, ownership denial, export shape, deletion state, and validation failures.
- `lib/classscout/privacy-service.ts`: consent records, recommendation eligibility gate, consent withdrawal, idempotent deletion requests, export request state, recoverable failure codes, and privacy-safe audit events.
- `lib/classscout/privacy-service.test.ts`: unit coverage for consent grant/withdrawal, recommendation blocking, deletion idempotency, export success/failure, retryability, and scope denial.
- `lib/classscout/onboarding-state.ts`: onboarding step model, accessible step metadata, validation, skip handling, stable API error mapping, idempotency key carriage, and normalized profile/preference payload builders.
- `lib/classscout/onboarding-state.test.ts`: unit coverage for step states, required/optional validation, normalized submit payloads, skip behavior, error mapping, and accessibility metadata.

Future implementation-1 modules must depend on this boundary before adding ingestion, review queue, search, recommendation, provider claim, or frontend surfaces.

## Consent and Privacy Lifecycle

Parent consent is a hard gate before child activity profile data can be used for recommendation scoring. Consent records include household ID, profile ID, actor user ID, consent type, notice version, status, grant timestamp, and optional withdrawal timestamp.

Consent withdrawal immediately makes recommendation eligibility fail with `CONSENT_REQUIRED`. Deletion requests are idempotent per household/target and can be retried after recoverable failures. Export requests expose `requested`, `processing`, `ready`, and `failed` states and carry only redacted household export data.

## Parent Onboarding Lifecycle

The onboarding contract supports `household`, `child`, `interests`, `constraints`, `history`, `privacy`, and `complete` steps. Required steps cannot be skipped. Optional steps can move the parent forward without local or offline persistence.

Each step carries explicit accessible metadata: `ariaLabel`, `describedBy`, and `errorSummaryId`. Validation maps errors to focus targets so UI can move focus to the correct summary after failed submit. API errors map to stable parent-facing codes: `VALIDATION_FAILED`, `CONSENT_REQUIRED`, `UNAUTHORIZED`, `RATE_LIMITED`, `SAVE_FAILED`, and `TIMEOUT`.

The state contract carries an idempotency key through the flow so route/API integration can retry a failed save without duplicate submission. It does not store child profile values in localStorage, indexedDB, or offline fallbacks.

## UI and Accessibility Gate

All ClassScout UI must use `sovereignsquad/general-design-system` exclusively. Any profile, discovery, provider, review, or privacy surface must include keyboard operation, semantic headings, labeled controls, visible focus states, non-color-only status, screen-reader compatible errors/status, and reduced-motion handling.

Required runtime states for applicable UI/API flows are: loading, empty, partial, disabled, saving/processing, success, validation error, system error, timeout, retry available, destructive confirmation, rollback/recovered, and permission denied.

## Observability

ClassScout audit events may include capability ID, action, status, household ID, profile ID, request ID, reason code, run ID, and timestamp. They must not include child names, parent emails, raw support notes, raw profile text, secrets, or full request bodies.

Failure paths must surface stable error codes and retryability. Timeout and retry behavior must be bounded and visible to operators or the parent UI where relevant.

## Rollback and Recovery

The initial foundation adds contracts, service code, tests, and docs only. Rollback is a code revert with no destructive data migration. Once persistent storage is introduced, rollback must retain fields and disable affected routes before any cleanup migration is considered.

For privacy workflows, disabling dashboard controls must not delete consent, export, or deletion-request records. Pending deletion jobs require a manual runbook path before cleanup migration.

For onboarding, hide the route/entry point and keep saved profile, consent, and deletion/export state intact. UI rollback must not perform destructive data cleanup.

## Verification

Run these before closing implementation issues:

```bash
npm run lint
npm run test
npm run typecheck
npm run build
npm run gds:compliance
npm run semantic:audit
npm run i18n:audit
```

The current delivery branch was prepared through GitHub APIs because local shell execution was unavailable in the agent environment.
