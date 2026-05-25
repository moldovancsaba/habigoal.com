# Design System Adapter

`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM` is the single source of truth for design, UI, and UX. Project-local files describe only implementation adapter details, migration state, validation commands, and approved exceptions.

Habigoal currently uses Mantine with local adapters. The target is 100% General Design System consumption through `@gds/theme`, `@gds/core`, and `@gds/admin`.

## Current Implementation

| Layer | Current role | Target GDS owner |
|--------|--------------|------------------|
| `components/theme/ThemeRegistry.tsx` | Mantine provider, local theme mode context, locale direction | `@gds/theme` `GdsProvider` plus thin Habigoal auth/locale adapter |
| `theme/mantine-theme.ts` | Local Mantine theme and component defaults | `@gds/theme` `gdsTheme` / `extendGdsTheme(...)` |
| `theme/tokens.ts` and `theme/typography.ts` | Local layout, tone, and typography constants | GDS tokens and component contracts |
| `components/layout/DashboardShell.tsx` | Protected app shell, nav, footer, role-aware layout | `@gds/admin` `AppShell` plus Habigoal nav data |
| `components/ui/*` | Local page, card, switcher, and data-card primitives | `@gds/core` / `@gds/admin` components or thin route-aware adapters |
| `app/globals.css` | Global atmosphere, CSS variables, print helpers, chart font handling | GDS global baseline plus approved print/chart exceptions |

## GDS Package Use

The intended dependency set is:

```txt
@gds/theme
@gds/core
@gds/admin
```

Current blocker: these packages are not available from the public npm registry, and the inspected package peer range targets Mantine `^7.9.0` while Habigoal uses Mantine `8.3.6`.

Do not add direct imports from `@gds/*` until the package source is available in a stable way and Mantine peer compatibility is resolved.

## Allowed Local Adapters

Local code may adapt:

- `next-intl` locale messages into GDS i18n context.
- `@/i18n/navigation` route links into GDS shell/nav components.
- OAuth session and Habigoal role/team state into shell actions and access summaries.
- Product data into GDS cards, tables, forms, and state blocks.
- Chart, PDF, public news, and provider-branded auth exception containers.

Local code must not define a competing token system, generalized component behavior, canonical spacing scale, control semantics, or responsive rules.

## First Safe Implementation Step

The first code PR should be intentionally small:

1. Add a stable package source for `@gds/theme`, `@gds/core`, and `@gds/admin`.
2. Confirm Mantine 8 compatibility or align both repos on the same Mantine major.
3. Replace root provider setup with GDS provider semantics while preserving Habigoal theme mode, locale, RTL, and consent behavior.
4. Migrate one high-value surface, preferably the public landing page or one dashboard page header/card set.
5. Add a lockfile audit that fails duplicate Mantine majors or mixed GDS versions.

## Migration Sequence

1. Root provider and theme.
2. Shared buttons, page headers, state blocks, cards, and form fields.
3. Dashboard shell, nav, tables, stats, and responsive data views.
4. Athlete app and trainer dashboard surfaces.
5. Settings, restore, governance, and admin CRUD surfaces.
6. News/article shell and public pages.
7. Delete obsolete local token/theme/component authority.

## Validation

Run the standard gates after every migration slice:

```bash
npm run semantic:audit
npm run i18n:audit
npm run lint
npm run test
npm run typecheck
npm run build
```

`npm run semantic:audit` should evolve from legacy hue cleanup into a strict GDS compliance gate.
