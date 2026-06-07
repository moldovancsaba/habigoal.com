# Implementation 5 Project Structure

## Delivered Issues

- `#147` Platform: Form discovery and governance manifest - canonical registry foundation
- `#148` Platform: Shared form schema compiler - typed schema generation and compatibility gates

## Files

- `config/form-registry.json`: static last-known-good form registry snapshot.
- `lib/form-registry.ts`: canonicalization, dedupe, summary, status, and fallback helpers.
- `lib/form-registry.test.ts`: registry behavior coverage.
- `lib/forms/compiler.ts`: compiled form contracts, diagnostics, maps, and fallback helpers.
- `lib/forms/compiler.test.ts`: compiler behavior coverage.
- `app/api/admin/form-registry/route.ts`: read-only admin registry endpoint.
- `app/api/forms/contracts/route.ts`: read-only compiled contract endpoint.
- `docs/implementation-5.md`: operational and contract documentation.

## Sequencing

`#147` is the foundation for later implementation-5 form work. `#148` depends on #147 and exposes generated contracts that later migration issues should consume instead of inventing page-local form payloads, validation maps, or accessibility metadata.

## Gates

- Critical blockers are represented by non-empty `blockers` arrays.
- Duplicate route conflicts increment `inconsistentRouteCount`.
- A registry response is `blocked` when blockers or duplicate route conflicts exist.
- Compiler diagnostics fail when field sets are empty, duplicate fields exist, locale coverage is missing, or unsupported GDS component families are referenced.
- CI should fail future migration gates when critical blockers or compiler drift errors exceed the agreed zero threshold.

## Accessibility

The registry records `gdsComponentSet`, `locales`, `requiresAuth`, and `ownerTeam` so migration work can verify GDS-only form families, i18n coverage, authorization boundaries, and ownership before changing UI.

The compiler preserves those fields in `CompiledFormContract` so UI renderers can enforce labels, field types, required flags, stable option arrays, and route-level ownership without duplicating configuration.
