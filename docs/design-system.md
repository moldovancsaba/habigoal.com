# Design System Adapter

`/Users/Shared/Projects/general-design-system` is the single source of truth for design, UI, and UX. Project-local files describe only implementation adapter details, migration state, validation commands, and approved exceptions.

Habigoal uses Mantine through the governed General Design System runtime. Product code consumes GDS contracts through the unified `@doneisbetter/gds` package, with `@doneisbetter/gds-eslint-config` and `@doneisbetter/gds-compliance` as governance packages.

Latest inspected GDS line: `3.4.7`.

## Current Implementation

| Layer | Current role | Target GDS owner |
|--------|--------------|------------------|
| `components/theme/ThemeRegistry.tsx` | Thin adapter around `GdsProvider`, theme mode, and locale direction | `@doneisbetter/gds/client` |
| `theme/mantine-theme.ts` | Product theme extension passed into GDS provider | GDS tokens and approved Habigoal extension points |
| `theme/tokens.ts` and `theme/typography.ts` | Approved token surfaces for remaining migration exceptions | GDS tokens and component contracts |
| `components/layout/DashboardShell.tsx` | Protected app shell, nav, footer, role-aware layout | `@doneisbetter/gds/client` `AppShell` plus Habigoal nav data |
| `components/ui/*` | Historical local adapters, not the preferred import path | Direct `@doneisbetter/gds/client` / `@doneisbetter/gds/server` imports or thin route-aware adapters |
| `app/globals.css` | Global atmosphere, CSS variables, print helpers, chart font handling | GDS global baseline plus approved print/chart exceptions |

## GDS Package Use

The active dependency set is:

```txt
@doneisbetter/gds
@doneisbetter/gds-eslint-config
@doneisbetter/gds-compliance
```

Current package source: live npm packages under `@doneisbetter/*` at `^3.4.7`. Do not reintroduce sibling `file:` package links, split runtime packages, or the old placeholder package namespace.

GDS `3.4.7` supports Mantine `^7.9.0`, `^8.3.0`, and `^9.0.0`; Habigoal is on Mantine `8.3.x`.

Use GDS subpath imports deliberately:

- `@doneisbetter/gds/server` for server-safe layouts, metadata-adjacent composition, and non-hook structural primitives.
- `@doneisbetter/gds/client` for providers, hooks, theme toggles, semantic buttons, responsive data views, and other interactive surfaces.

## Allowed Local Adapters

Local code may adapt:

- `next-intl` locale messages into GDS i18n context.
- `@/i18n/navigation` route links into GDS shell/nav components.
- OAuth session and Habigoal role/team state into shell actions and access summaries.
- Product data into GDS cards, tables, forms, and state blocks.
- Chart, PDF, public news, and provider-branded auth exception containers.

Local code must not define a competing token system, generalized component behavior, canonical spacing scale, control semantics, or responsive rules.

The machine-readable adoption contract is [gds-adoption.json](/Users/Shared/Projects/habigoal/gds-adoption.json). Keep it aligned with this document and the current GDS release line.

## Current Implementation Priority

The package and provider adoption blocker is resolved. The current priority is reconciliation and hardening:

1. Keep `@doneisbetter/gds`, `@doneisbetter/gds-eslint-config`, and `@doneisbetter/gds-compliance` aligned on the same release line.
2. Keep `npm run gds:audit` and `npm run gds:compliance` passing before claiming GDS-governed delivery.
3. Replace remaining repeated page-local Mantine patterns with GDS component families where the contract exists.
4. Keep local adapters route-aware only: routing, locale, role/team data, charts, PDF internals, content files, and provider-specific auth.
5. Update GitHub issues/project state whenever the audited GDS adoption state changes.

## Migration Sequence

1. Root provider and theme.
2. Shared buttons, page headers, state blocks, cards, and form fields.
3. Dashboard shell, nav, tables, stats, and responsive data views.
4. Athlete app and trainer dashboard surfaces.
5. Settings, restore, governance, and admin CRUD surfaces.
6. News/article shell and public pages.
7. Delete obsolete local token/gds-theme/component authority.

## Validation

Run the standard gates after every migration slice:

```bash
npm run semantic:audit
npm run gds:audit
npm run i18n:audit
npm run lint
npm run test
npm run typecheck
npm run build
```

`npm run semantic:audit` should evolve from legacy hue cleanup into a strict GDS compliance gate.
`npm run gds:audit` is the explicit 100% GDS-only readiness check. It must pass with all declared contract adapters active and the manifest migration status set to `governed`.
`npm run gds:compliance` runs the shared GDS compliance package and must pass before delivery that touches UI, layout, theme, or GDS adoption state.
