# General Design System Adoption Plan

Status: Foundation plan
Last updated: 2026-05-25

Sources inspected:

- [sovereignsquad/general-design-system](https://github.com/sovereignsquad/general-design-system)
- `/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`

## What GDS Provides

The General Design System repo exposes three product packages:

- `@gds/theme`: `gdsTheme`, `extendGdsTheme(...)`, `withGdsMotion(...)`, `GdsProvider`, and GDS i18n helpers.
- `@gds/core`: semantic buttons, page headers, product cards, metric/progress cards, state blocks, article/auth/public shells, upload/media primitives, filter drawers, form fields, locale helpers, icons, and vocabulary.
- `@gds/admin`: protected workspace shell, data table, responsive data view, form section, stats strip, semantic nav link, info card, workspace header, page header, and editor scaffold.

The repo also defines adoption governance:

- GDS is the single source of truth for design, UI, and UX.
- Product repos may document adapter details, migration state, validation commands, and approved exceptions only.
- Mantine is the only foundational UI system.
- Raw colors, local token redefinition, duplicate component behavior, and repeated hard-coded spacing are not allowed in product feature code.

## Habigoal Gap

Habigoal has the right foundation choice, Mantine, but it is not yet GDS-only.

Current gaps:

- Local design docs previously acted as the design-system authority.
- Local theme/tokens/typography files still own visual decisions.
- Local UI primitives duplicate contracts that should come from `@gds/core` and `@gds/admin`.
- `app/globals.css` contains product-local colors, shadows, gradients, and glass utilities.
- GDS packages are not available through the public npm registry.
- Local GDS package version inspected: `@gds/theme@2.3.2`.
- GDS package peer dependencies currently target Mantine `^7.9.0`; Habigoal uses Mantine `8.3.6`.

## Dependency Strategy

Do not install `@gds/*` from npm yet. The public registry lookup currently fails.

Acceptable package-source options, in priority order:

1. Publish `@gds/theme`, `@gds/core`, and `@gds/admin` to the organization package registry with Mantine 8-compatible peer ranges.
2. Add the GDS repo as a workspace/submodule only if the deployment environment can reliably install private Git dependencies.
3. Temporarily vendor built package artifacts only as a short-lived migration bridge, not as permanent product-local source.

The preferred long-term route is published packages with aligned Mantine major versions.

## Implementation Plan

### Phase 0: Authority Lock

- Keep `DESIGN.md` and `docs/design-system.md` as adapter documents only.
- Stop adding local token definitions or generalized UI primitives.
- Open GDS issues for missing component behavior instead of solving it locally.

### Phase 1: Package Compatibility

- Release or consume `@gds/*` packages from a stable source.
- Align Mantine peer dependency with Habigoal's active Mantine major.
- Add a lockfile check that fails duplicate Mantine majors and mixed GDS versions.

### Phase 2: Root Provider

- Replace local Mantine provider ownership with `@gds/theme`.
- Preserve Habigoal-specific locale, RTL, OAuth/session, cookie consent, and theme-mode behavior through a thin adapter.
- Confirm modals and notifications are mounted once.

### Phase 3: Core UI

- Replace local `PageHeader`, `SectionCard`, `ResponsiveDataCard`, empty/error states, action buttons, and form wrappers with GDS primitives.
- Keep local adapters only for route links, translations, and product data mapping.

### Phase 4: Admin Workspace

- Replace `DashboardShell`, admin tables, settings sections, restore bin, governance cards, and CRUD surfaces with `@gds/admin` contracts.
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

## Approved Exceptions

The following can remain product-local after GDS migration, but their framing must follow GDS:

- Recharts chart internals.
- PDF generation internals.
- Public news content files.
- Provider-branded OAuth controls.
- Print-only report styles.
- Data and access-control adapters.

## Recommended First Code PR

The first implementation PR should not attempt a whole-app migration.

Scope:

- Add package source for GDS packages.
- Add dependency compatibility guard.
- Replace root provider with GDS provider semantics.
- Migrate one representative public page or dashboard page section.
- Validate with lint, test, typecheck, build, i18n audit, and semantic audit.

This keeps risk low while proving the integration path.
