# General Design System Adoption Plan

Status: GDS governed baseline passing
Last updated: 2026-06-26

Sources inspected:

- [sovereignsquad/general-design-system](https://github.com/sovereignsquad/general-design-system)
- `/Users/Shared/Projects/general-design-system`
- Latest inspected GDS version: `3.4.7`
- Latest inspected GDS package: `@doneisbetter/gds`

## What GDS Provides

The General Design System repo now exposes the unified product package plus governance packages:

- `@doneisbetter/gds`: unified runtime package exposing theme, core, admin, server, and client entrypoints.
- `@doneisbetter/gds-eslint-config`: shared lint enforcement for raw design values and forbidden drift.
- `@doneisbetter/gds-compliance`: shared manifest and repository-level compliance validation.

The repo also defines adoption governance:

- GDS is the single source of truth for design, UI, and UX.
- Product repos may document adapter details, migration state, validation commands, and approved exceptions only.
- Mantine is the only foundational UI system.
- Raw colors, local token redefinition, duplicate component behavior, and repeated hard-coded spacing are not allowed in product feature code.
- Mature adopters should include a machine-readable `gds-adoption.json` manifest.
- App Router consumers should use server-safe and client-safe GDS subpath imports.

## Habigoal Gap

Habigoal has the right foundation choice, Mantine, and now passes the shared `@doneisbetter/gds-compliance` repository check. The protected dashboard shell now consumes the GDS `AppShell` contract through a thin Habigoal adapter that supplies role-aware navigation, account controls, locale switching, and theme persistence.

Current gaps:

- Local design docs previously acted as the design-system authority.
- Local theme/tokens/typography files still own visual decisions.
- Legacy local UI primitive files still exist for historical compatibility, but checked application paths now import GDS surfaces directly instead of importing local `components/ui` wrappers.
- `app/globals.css` contains product-local colors, shadows, gradients, and glass utilities.
- GDS packages are published on npm under the real `@doneisbetter/*` namespace.
- Local GDS package version inspected: `3.4.7`.
- GDS package peer dependencies support Mantine `^7.9.0`, `^8.3.0`, and `^9.0.0`; Habigoal uses Mantine `8.3.x`.
- Habigoal now installs the unified `@doneisbetter/gds` package from npm.
- The root provider is now `GdsProvider` from `@doneisbetter/gds/client`, wrapped by the Habigoal theme-mode adapter.
- Habigoal now includes [gds-adoption.json](/Users/Shared/Projects/habigoal/gds-adoption.json) to declare the current migration state and exceptions.
- App pages now use `PageHeader`, `SectionPanel`, `StateBlock`, and `FormField` from `@doneisbetter/gds/client` directly where the GDS contract is compatible.
- Habigoal semantic token files were moved under `theme/` so raw token literals live only in approved token surfaces.
- `npm run gds:compliance` passes. `npm run gds:audit` is expected to pass when the manifest remains `governed` and all declared contract adapters stay active.

## Dependency Strategy

Use the live npm packages directly: `@doneisbetter/gds`, `@doneisbetter/gds-eslint-config`, and `@doneisbetter/gds-compliance` at `^3.4.7`. Do not reintroduce sibling `file:` package links, split runtime dependencies, or the old placeholder package namespace.

The preferred long-term route is published packages with aligned Mantine major versions. The latest GDS compatibility matrix supports Mantine `7.9.x` and `8.3.x`, React `18.2.x` / `19.x`, Next `15.x`, and Vite `8.x`.

## App Router Import Contract

After package adoption, use server/client entrypoints deliberately:

```ts
import { gdsTheme, extendGdsTheme, PageHeader, PublicShell, ArticleShell, WorkspaceHeader } from "@doneisbetter/gds/server";
```

```tsx
"use client";

import { GdsProvider, SemanticButton, ThemeToggle, AppShell, ResponsiveDataView } from "@doneisbetter/gds/client";
```

Root layout should own `lang`, `dir`, and any framework script setup. A single client provider boundary should mount `GdsProvider`.

## Implementation Plan

### Phase 0: Authority Lock

- Keep `DESIGN.md` and `docs/design-system.md` as adapter documents only.
- Stop adding local token definitions or generalized UI primitives.
- Open GDS issues for missing component behavior instead of solving it locally.

### Phase 1: Package Compatibility

- Done: consume `@doneisbetter/*` packages from a stable registry source.
- Keep Mantine on one supported major.
- Add a lockfile check that fails duplicate Mantine majors and mixed GDS versions.
- Keep `@doneisbetter/gds-eslint-config` and `@doneisbetter/gds-compliance` wired, then expand them from migration gates into release gates.

### Phase 2: Root Provider

- Done: replace local Mantine provider ownership with `GdsProvider` from `@doneisbetter/gds/client`.
- Preserve Habigoal-specific locale, RTL, OAuth/session, cookie consent, and theme-mode behavior through a thin adapter.
- Confirm modals and notifications are mounted once.

### Phase 3: Core UI

- Replace local `PageHeader`, `SectionCard`, `ResponsiveDataCard`, empty/error states, action buttons, and form wrappers with GDS primitives.
- Keep local adapters only for route links, translations, and product data mapping.
- Current status: application surfaces use direct GDS `AppShell`, `PageHeader`, `SectionPanel`, `StateBlock`, `FormField`, and `SemanticButton` imports for migrated pages. Destructive confirmations, upload/dropzone behavior, and access recovery states remain useful future hardening work, but they are no longer GDS audit blockers.

## New GDS Coverage To Use Next

The `@doneisbetter/gds@3.4.7` package now covers these Habigoal non-standard elements:

- `SemanticButton`: replace repeated arbitrary action buttons for save, add, delete, download, copy, confirm, cancel, and start flows.
- `ConfirmDialog`: replace browser `confirm(...)` and bespoke destructive modals.
- `ThemeToggle`: replace local theme switcher once it can connect to Habigoal's theme-mode adapter.
- `UploadDropzone` and `MediaField`: replace custom media/upload controls and image URL entry surfaces.
- `AccessRecoveryPanel`: standardize unauthenticated, expired-session, forbidden, missing, and unavailable states.
- `ChoiceChip`: replace repeated pill/choice controls where a selectable chip is currently assembled from Mantine primitives.
- `DataToolbar`, `FilterDrawer`, `ResponsiveDataView`, and `SimpleDataTable`: replace local search/filter/table/card-list patterns after route-specific data contracts are mapped.
- `WorkspaceHeader`, `StatsStrip`, `InfoCard`, and `FormSection`: replace dashboard section headers, metric strips, settings blocks, and admin form groupings.

### Phase 4: Admin Workspace

- Replace remaining admin tables, settings sections, restore bin, governance cards, and CRUD surfaces with admin/workspace contracts from `@doneisbetter/gds`.
- The dashboard shell now uses GDS `AppShell`; Habigoal keeps only the product-specific data adapter around it for role-routing, locale switching, account controls, and a theme bridge that syncs the GDS toggle back into Habigoal's persisted theme mode.
- Use GDS responsive data views for mobile/RTL-heavy surfaces.

### Phase 5: Surface Cleanup

- Migrate athlete app, trainer dashboard, planning, records, news, legal, and settings screens.
- Delete obsolete local tokens, styles, glass utilities, and component wrappers as each surface moves.

### Phase 6: Compliance Gate

- Expand `npm run semantic:audit` into a GDS audit:
- Fail raw colors in feature code.
- Fail local generalized component definitions outside approved adapter paths.
- Fail imports from local theme/token files after migration cutover.
- Fail direct Mantine primitives where a GDS primitive exists and is required.
- Validate `gds-adoption.json` against the GDS schema.
- Add shared GDS lint/gds-compliance tooling once package publication is available.
- Keep `npm run gds:audit` passing before any delivery can claim the repo remains GDS-governed.

## Approved Exceptions

The following can remain product-local after GDS migration, but their framing must follow GDS:

- Recharts chart internals.
- PDF generation internals.
- Public news content files.
- Provider-branded OAuth controls.
- Print-only report styles.
- Data and access-control adapters.

## Current Migration Slice

The first implementation slice intentionally avoids whole-app migration.

Scope:

- GDS packages are installed from npm under the unified `@doneisbetter/gds` package line.
- The root provider uses `GdsProvider` from `@doneisbetter/gds/client`.
- Next.js transpiles the GDS package line and resolves peer dependencies from Habigoal's `node_modules`.
- `gds-adoption.json`, `npm run gds:audit`, `npm run gds:compliance`, and scoped GDS ESLint config are wired.
- No GDS audit-blocking adapters remain. Additional component-family migrations remain useful, but `AppShell`, `PageHeader`, `StateBlock`, `FormField`, and `SemanticButton` are now active in production surfaces.

This keeps risk low while proving the integration path.

## Validation

```bash
npm run gds:audit
npm run semantic:audit
npm run i18n:audit
npm run lint
npm run test
npm run typecheck
npm run build
```

`npm run gds:compliance` and `npm run gds:audit` must pass on every delivery that touches UI, layout, theme, or design-system adoption state.
