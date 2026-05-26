# General Design System Adoption Plan

Status: Partial adoption
Last updated: 2026-05-26

Sources inspected:

- [sovereignsquad/general-design-system](https://github.com/sovereignsquad/general-design-system)
- `/Users/Shared/Projects/general-design-system`
- Latest inspected GDS version: `2.6.1`
- Latest inspected GDS commit: `53c52b8`

## What GDS Provides

The General Design System repo exposes five publishable packages:

- `@doneisbetter/gds-theme`: `gdsTheme`, `extendGdsTheme(...)`, `withGdsMotion(...)`, `GdsProvider`, and GDS i18n helpers.
- `@doneisbetter/gds-core`: semantic buttons, page headers, product cards, public product cards, metric/progress cards, state blocks, article/auth/public/docs shells, public navigation/footer primitives, editorial hero, feature band, accent panel, upload/media primitives, filter drawers, form fields, simple data tables, stats sections, locale helpers, icons, and vocabulary.
- `@doneisbetter/gds-admin`: protected workspace shell, data table, responsive data view, form section, stats strip, semantic nav link, info card, workspace header, page header, and editor scaffold.
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

Habigoal has the right foundation choice, Mantine, but it is not yet GDS-only.

Current gaps:

- Local design docs previously acted as the design-system authority.
- Local theme/tokens/typography files still own visual decisions.
- Local UI primitives duplicate contracts that should come from `@doneisbetter/gds-core` and `@doneisbetter/gds-admin`.
- `app/globals.css` contains product-local colors, shadows, gradients, and glass utilities.
- GDS packages are publish-ready and the GDS repository now includes a manual `GDS Publish` workflow, but registry checks from this consumer repo still return npm HTTP 404 for all required `@doneisbetter/*` packages.
- Local GDS package version inspected: `2.6.1`.
- GDS package peer dependencies support Mantine `^7.9.0` and `^8.3.0`; Habigoal uses Mantine `8.3.x`.
- Habigoal now installs the GDS packages from the sibling checkout as a temporary migration bridge.
- The root provider is now `GdsProvider` from `@doneisbetter/gds-theme/client`, wrapped by the Habigoal theme-mode adapter.
- Habigoal now includes [gds-adoption.json](/Users/Shared/Projects/habigoal/gds-adoption.json) to declare the current migration state and exceptions.

## Dependency Strategy

Do not switch the package source to npm until the release operator confirms publication and registry access.

Acceptable package-source options, in priority order:

1. Run the GDS repository's authenticated `GDS Publish` workflow, then verify `@doneisbetter/gds-theme`, `@doneisbetter/gds-core`, `@doneisbetter/gds-admin`, `@doneisbetter/gds-eslint-config`, and `@doneisbetter/gds-compliance` resolve from the selected organization package registry.
2. Replace the temporary `file:../general-design-system/packages/*` package source with the approved registry source.
3. Add the GDS repo as a workspace/submodule only if the deployment environment can reliably install private Git dependencies.

The preferred long-term route is published packages with aligned Mantine major versions. The latest GDS compatibility matrix supports Mantine `7.9.x` and `8.3.x`, React `18.2.x` / `19.x`, Next `15.x`, and Vite `8.x`.

## App Router Import Contract

After package adoption, use server/client entrypoints deliberately:

```ts
import { gdsTheme, extendGdsTheme } from "@doneisbetter/gds-theme/server";
import { PageHeader, PublicShell, ArticleShell } from "@doneisbetter/gds-core/server";
import { WorkspaceHeader } from "@doneisbetter/gds-admin/server";
```

```tsx
"use client";

import { GdsProvider } from "@doneisbetter/gds-theme/client";
import { SemanticButton, ThemeToggle } from "@doneisbetter/gds-core/client";
import { AppShell, ResponsiveDataView } from "@doneisbetter/gds-admin/client";
```

Root layout should own `lang`, `dir`, and any framework script setup. A single client provider boundary should mount `GdsProvider`.

## Implementation Plan

### Phase 0: Authority Lock

- Keep `DESIGN.md` and `docs/design-system.md` as adapter documents only.
- Stop adding local token definitions or generalized UI primitives.
- Open GDS issues for missing component behavior instead of solving it locally.

### Phase 1: Package Compatibility

- Release or consume `@doneisbetter/*` packages from a stable registry source.
- Keep Mantine on one supported major.
- Add a lockfile check that fails duplicate Mantine majors and mixed GDS versions.
- Keep `@doneisbetter/gds-eslint-config` and `@doneisbetter/gds-compliance` wired, then expand them from migration gates into release gates.

### Phase 2: Root Provider

- Replace local Mantine provider ownership with `@doneisbetter/gds-theme`.
- Preserve Habigoal-specific locale, RTL, OAuth/session, cookie consent, and theme-mode behavior through a thin adapter.
- Confirm modals and notifications are mounted once.

### Phase 3: Core UI

- Replace local `PageHeader`, `SectionCard`, `ResponsiveDataCard`, empty/error states, action buttons, and form wrappers with GDS primitives.
- Keep local adapters only for route links, translations, and product data mapping.

### Phase 4: Admin Workspace

- Replace `DashboardShell`, admin tables, settings sections, restore bin, governance cards, and CRUD surfaces with `@doneisbetter/gds-admin` contracts.
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
- Keep `npm run gds:audit` failing until the repo is genuinely 100% GDS-only.

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

- GDS packages are installed from the sibling checkout until registry publication is available.
- The root provider uses `GdsProvider` from `@doneisbetter/gds-theme/client`.
- Next.js transpiles the GDS package line and resolves peer dependencies from Habigoal's `node_modules`.
- `gds-adoption.json`, `npm run gds:audit`, `npm run gds:compliance`, and scoped GDS ESLint config are wired.
- Remaining work is adapter migration for AppShell, PageHeader, StateBlock, MetricCard, and FormField.

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

`npm run gds:audit` is expected to fail until the remaining local adapters are active and `migrationStatus` becomes `governed`. Do not claim Habigoal is 100% GDS-only until it passes.
