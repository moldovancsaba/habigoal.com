# Habigoal Design Adapter

Status: Migration adapter
Last updated: 2026-05-25

`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM` is the single source of truth for design, UI, and UX. Project-local files describe only implementation adapter details, migration state, validation commands, and approved exceptions.

Habigoal must not redefine component behavior, interaction patterns, token policy, responsive strategy, accessibility baseline, or canonical control semantics locally. Those decisions belong to the General Design System.

Latest inspected GDS line: `2.4.3` at commit `787a8ce`.

## Current Position

Habigoal is not yet 100% GDS-only.

The application still contains local theme and UI adapter code that predates the General Design System package boundary:

- [theme/mantine-theme.ts](/Users/Shared/Projects/habigoal/theme/mantine-theme.ts)
- [theme/tokens.ts](/Users/Shared/Projects/habigoal/theme/tokens.ts)
- [theme/typography.ts](/Users/Shared/Projects/habigoal/theme/typography.ts)
- [components/theme/ThemeRegistry.tsx](/Users/Shared/Projects/habigoal/components/theme/ThemeRegistry.tsx)
- [components/layout/DashboardShell.tsx](/Users/Shared/Projects/habigoal/components/layout/DashboardShell.tsx)
- [components/ui](/Users/Shared/Projects/habigoal/components/ui)
- [app/globals.css](/Users/Shared/Projects/habigoal/app/globals.css)

These files are temporary product adapters until Habigoal consumes `@gds/theme`, `@gds/core`, `@gds/admin`, `@gds/eslint-config`, and `@gds/compliance`.

The machine-readable adoption contract is [gds-adoption.json](/Users/Shared/Projects/habigoal/gds-adoption.json).

## Required GDS Package Boundary

The target package boundary is:

- `@gds/theme`: root provider, Mantine theme, direction, modals, notifications, and GDS i18n context.
- `@gds/core`: shared product primitives such as semantic buttons, page headers, metric/progress/product cards, public product cards, state blocks, article/auth/public/docs shells, public navigation/footer primitives, editorial hero, feature band, accent panel, upload/media components, filters, form fields, simple tables, and stats sections.
- `@gds/admin`: protected workspace primitives such as app shell, data table, responsive data view, form section, stats strip, admin page header, workspace header, and editor scaffold.
- `@gds/eslint-config`: shared lint enforcement for GDS drift.
- `@gds/compliance`: manifest and repo-level compliance validation.

Habigoal-specific code may provide thin adapters only when needed for routing, `next-intl`, auth state, team/role context, or product data mapping.

## Known Integration Blockers

- GDS packages are publish-ready, but registry checks from this consumer repo currently return npm HTTP 404.
- The inspected GDS packages declare Mantine `^7.9.0` peers.
- Habigoal currently uses Mantine `8.3.6`.

Until those blockers are resolved, direct package adoption is unsafe because it can create duplicate Mantine contracts or peer dependency drift.

When packages are consumable, use `@gds/*/server` for server-safe App Router composition and `@gds/*/client` for providers, hooks, and interactive surfaces.

## Migration Rules

1. Do not add new local token definitions.
2. Do not add new local component behavior that belongs in GDS.
3. Use existing local adapters only when touching legacy surfaces.
4. New generalized UI primitives should be added to GDS first, then consumed by Habigoal.
5. Product-specific copy, data mapping, access control, and route wiring stay in Habigoal.
6. Charts, PDFs, external embeds, and provider-branded auth controls may remain exceptions, but their containers, states, spacing, and actions should follow GDS.

## Migration Phases

1. **Authority lock:** Treat GDS as the only design authority and remove local docs that redefine token/component policy.
2. **Compatibility release:** Publish or otherwise consume compatible `@gds/theme`, `@gds/core`, `@gds/admin`, `@gds/eslint-config`, and `@gds/compliance` packages.
3. **Root provider migration:** Replace `ThemeRegistry` and local Mantine theme ownership with `GdsProvider` or `extendGdsTheme(...)`.
4. **Core primitive migration:** Replace local `PageHeader`, `SectionCard`, `ResponsiveDataCard`, action buttons, state blocks, and form wrappers with GDS primitives or thin adapters.
5. **Protected workspace migration:** Replace local dashboard shell, nav links, stats strips, settings tables, restore views, and CRUD layouts with `@gds/admin`.
6. **CSS/token deletion:** Remove local design tokens, raw colors, repeated spacing literals, and bespoke glass surface classes after equivalent GDS coverage exists.
7. **Enforcement:** Add `@gds/eslint-config`, `@gds/compliance`, adoption-manifest validation, and an expanded `npm run semantic:audit` gate that fails new local token authority, raw colors, and non-GDS generalized UI primitives.

## Validation

Use these checks during migration:

```bash
npm run semantic:audit
npm run gds:audit
npm run i18n:audit
npm run lint
npm run test
npm run typecheck
npm run build
```

`npm run gds:audit` must pass before Habigoal can be called 100% GDS-only. Once GDS packages are installed, keep the package compatibility check verifying exactly one Mantine major version and exactly one GDS package version family in the lockfile.
