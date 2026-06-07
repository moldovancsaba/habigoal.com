# Implementation 5 Project Structure

## Delivered Issue

- `#147` Platform: Form discovery and governance manifest - canonical registry foundation

## Files

- `config/form-registry.json`: static last-known-good form registry snapshot.
- `lib/form-registry.ts`: canonicalization, dedupe, summary, status, and fallback helpers.
- `lib/form-registry.test.ts`: registry behavior coverage.
- `app/api/admin/form-registry/route.ts`: read-only admin endpoint.
- `docs/implementation-5.md`: operational and contract documentation.

## Sequencing

`#147` is the foundation for later implementation-5 form work. Later migration issues should read from the registry instead of inventing page-local form ownership or accessibility metadata.

## Gates

- Critical blockers are represented by non-empty `blockers` arrays.
- Duplicate route conflicts increment `inconsistentRouteCount`.
- A registry response is `blocked` when blockers or duplicate route conflicts exist.
- CI should fail future migration gates when critical blockers exceed the agreed zero threshold.

## Accessibility

The registry records `gdsComponentSet`, `locales`, `requiresAuth`, and `ownerTeam` so migration work can verify GDS-only form families, i18n coverage, authorization boundaries, and ownership before changing UI.
