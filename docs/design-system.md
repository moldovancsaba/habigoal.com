# Design System Adapter

`/Users/Shared/Projects/general-design-system` is the single source of truth for design, UI, and UX. Project-local files describe only implementation adapter details, migration state, validation commands, and approved exceptions.

Habigoal currently uses Mantine with local adapters and the GDS root provider. The target is 100% General Design System consumption through `@doneisbetter/gds-theme`, `@doneisbetter/gds-core`, `@doneisbetter/gds-admin`, `@doneisbetter/gds-eslint-config`, and `@doneisbetter/gds-compliance`.

Latest inspected GDS line: `2.6.1` at commit `53c52b8`.

## Current Implementation

| Layer | Current role | Target GDS owner |
|--------|--------------|------------------|
| `components/theme/ThemeRegistry.tsx` | GDS provider, local theme mode context, locale direction | `@doneisbetter/gds-theme` `GdsProvider` plus thin Habigoal auth/locale adapter |
| `theme/mantine-theme.ts` | Local Mantine theme and component defaults | `@doneisbetter/gds-theme` `gdsTheme` / `extendGdsTheme(...)` |
| `theme/tokens.ts` and `theme/typography.ts` | Local layout, tone, and typography constants | GDS tokens and component contracts |
| `components/layout/DashboardShell.tsx` | Protected app shell, nav, footer, role-aware layout | `@doneisbetter/gds-admin` `AppShell` plus Habigoal nav data |
| `components/ui/*` | Local page, card, switcher, and data-card primitives | `@doneisbetter/gds-core` / `@doneisbetter/gds-admin` components or thin route-aware adapters |
| `app/globals.css` | Global atmosphere, CSS variables, print helpers, chart font handling | GDS global baseline plus approved print/chart exceptions |

## GDS Package Use

The intended dependency set is:

```txt
@doneisbetter/gds-theme
@doneisbetter/gds-core
@doneisbetter/gds-admin
@doneisbetter/gds-eslint-config
@doneisbetter/gds-compliance
```

Current package source: live npm packages under `@doneisbetter/*` at `^2.6.1`. Do not reintroduce sibling `file:` package links or the old placeholder package namespace.

GDS `2.6.1` supports Mantine `^7.9.0` and `^8.3.0`; Habigoal is on Mantine `8.3.x`.

Once package adoption starts, use GDS subpath imports:

- `@doneisbetter/gds-theme/server`, `@doneisbetter/gds-core/server`, and `@doneisbetter/gds-admin/server` for server-safe layouts, metadata-adjacent composition, and non-hook structural primitives.
- `@doneisbetter/gds-theme/client`, `@doneisbetter/gds-core/client`, and `@doneisbetter/gds-admin/client` for providers, hooks, theme toggles, semantic buttons, responsive data views, and other interactive surfaces.

## Allowed Local Adapters

Local code may adapt:

- `next-intl` locale messages into GDS i18n context.
- `@/i18n/navigation` route links into GDS shell/nav components.
- OAuth session and Habigoal role/team state into shell actions and access summaries.
- Product data into GDS cards, tables, forms, and state blocks.
- Chart, PDF, public news, and provider-branded auth exception containers.

Local code must not define a competing token system, generalized component behavior, canonical spacing scale, control semantics, or responsive rules.

The machine-readable adoption contract is [gds-adoption.json](/Users/Shared/Projects/habigoal/gds-adoption.json). Keep it aligned with this document and the current GDS release line.

## First Safe Implementation Step

The first code PR should be intentionally small:

1. Keep the approved npm registry source for `@doneisbetter/gds-theme`, `@doneisbetter/gds-core`, `@doneisbetter/gds-admin`, `@doneisbetter/gds-eslint-config`, and `@doneisbetter/gds-compliance`.
2. Expand `@doneisbetter/gds-eslint-config` and `@doneisbetter/gds-compliance` from scoped migration gates into release gates.
3. Keep Mantine on a single supported major and fail duplicate Mantine majors in the lockfile.
4. Continue using GDS provider semantics while preserving Habigoal theme mode, locale, RTL, and consent behavior.
5. Migrate one high-value surface, preferably the public landing page or one dashboard page header/card set.
6. Add a lockfile audit that fails duplicate Mantine majors or mixed GDS versions.
7. Validate `gds-adoption.json` against the GDS schema.

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
`npm run gds:audit` is the explicit 100% GDS-only readiness check. It fails while local contract adapters remain planned or manifest migration status is not `governed`.
`npm run gds:compliance` runs the shared GDS compliance package and currently reports the remaining local UI imports and raw design values that must be eliminated during the adapter migration.
