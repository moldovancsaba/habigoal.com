# Design System Adapter

`/Users/Shared/Projects/general-design-system` is the single source of truth for design, UI, and UX. Project-local files describe only implementation adapter details, migration state, validation commands, and approved exceptions.

Habigoal uses Mantine through the governed General Design System runtime. Product code consumes GDS contracts through the unified `@sovereignsquad/gds` package, with `@sovereignsquad/gds-eslint-config` and `@sovereignsquad/gds-compliance` as governance packages.

Latest inspected GDS line: `3.9.0`.

## Current Implementation

| Layer | Current role | Target GDS owner |
|--------|--------------|------------------|
| `components/theme/ThemeRegistry.tsx` | Thin adapter around `GdsProvider`, theme mode, and locale direction | `@sovereignsquad/gds/client` |
| `theme/mantine-theme.ts` | Product theme extension passed into GDS provider | GDS tokens and approved Habigoal extension points |
| `theme/tokens.ts` and `theme/typography.ts` | Approved token surfaces for remaining migration exceptions | GDS tokens and component contracts |
| `components/layout/DashboardShell.tsx` | Protected app shell, nav, footer, role-aware layout | `@sovereignsquad/gds/client` `AppShell` plus Habigoal nav data |
| `components/ui/*` | Historical local adapters, not the preferred import path | Direct `@sovereignsquad/gds/client` / `@sovereignsquad/gds/server` imports or thin route-aware adapters |
| `app/globals.css` | Global atmosphere, CSS variables, print helpers, chart font handling | GDS global baseline plus approved print/chart exceptions |

## GDS Package Use

The active dependency set is:

```txt
@sovereignsquad/gds
@sovereignsquad/gds-eslint-config
@sovereignsquad/gds-compliance
```

Current package source: live npm packages under `@sovereignsquad/*` at `3.9.0`. Do not reintroduce sibling `file:` package links, split runtime packages, the former package scope, or the old placeholder package namespace.

GDS `3.9.0` supports the active Habigoal runtime with the GDS-owned engine packages resolved through `@sovereignsquad/gds`. The package overrides pin those auto-installed engine peers to the supported Mantine `8.3.x` lane because this App Router codebase still has temporary direct Mantine imports in server-rendered routes; Mantine `9.x` imports React client-only exports that are not available under the `react-server` condition.

Use GDS subpath imports deliberately:

- `@sovereignsquad/gds/server` for server-safe layouts, metadata-adjacent composition, and non-hook structural primitives.
- `@sovereignsquad/gds/client` for providers, hooks, theme toggles, semantic buttons, responsive data views, and other interactive surfaces.

## Allowed Local Adapters

Local code may adapt:

- `next-intl` locale messages into GDS i18n context.
- `@/i18n/navigation` route links into GDS shell/nav components.
- OAuth session and Habigoal role/team state into shell actions and access summaries.
- Product data into GDS cards, tables, forms, and state blocks.
- Chart, PDF, public news, and provider-branded auth exception containers.

Local code must not define a competing token system, generalized component behavior, canonical spacing scale, control semantics, or responsive rules.

The machine-readable adoption contract is [gds-adoption.json](/Users/Shared/Projects/Habigoal/gds-adoption.json). Keep it aligned with this document and the current GDS release line.

## Product UI Contract

Product-facing surfaces now resolve shell ownership, theme mode, portal inheritance, and status/action colors through [lib/product-ui-contracts.ts](/Users/Shared/Projects/Habigoal/lib/product-ui-contracts.ts). `ProductThemeBoundary` applies the resolved contract at route/product boundaries so portalled menus, selects, modals, and alerts inherit the active product theme.

- Habigoal remains an independent whitelabel habit-builder surface. It uses the `habigoal` contract even when opened by athletes or trainers.
- Athlete IQ uses the `athlete_iq` professional dark-gold contract and the GDS `review` token for gold warning/action states.
- Dashboard and shared athlete/trainer flows use the `dashboard` contract for operational status colors.
- Product/dashboard/form/insight components in the migrated scope import controls, actions, shell, and layout primitives through `@sovereignsquad/gds/client`.
- Direct `@mantine/core` imports in the migrated scope are allowed only for temporary passive display coverage gaps; those components must still use product contracts for color, state, and surrounding actions.
- Raw UI hue props such as `yellow`, `blue`, and `orange` are not allowed in migrated surfaces; use `getProductColor(surface, intent)` instead.

## Current Implementation Priority

The package and provider adoption blocker is resolved. The current priority is reconciliation and hardening:

1. Keep `@sovereignsquad/gds`, `@sovereignsquad/gds-eslint-config`, and `@sovereignsquad/gds-compliance` aligned on the same release line.
2. Keep `npm run gds:audit` and the Habigoal semantic UI gate passing before claiming GDS-governed delivery.
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

`npm run semantic:audit` is the blocking Habigoal UI compliance gate for migrated product/dashboard/form/insight surfaces.
`npm run gds:audit` is the explicit 100% GDS-only readiness check. It must pass with all declared contract adapters active and the manifest migration status set to `governed`.
`npm run gds:compliance` runs the shared GDS compliance package and is a blocking gate for GDS package, manifest, import, and raw-color governance. Source issue references use the `GH-123` form so the shared raw-color detector can fail on real hex/rgb values without flagging traceability comments.
