# Definition Of Done

Use this checklist for feature work, fixes, documentation updates, and automation-created branches.

## Build And Tests

- `npm run lint` passes.
- `npm run test` passes when code behavior changed.
- `npm run build` passes.
- `npm run typecheck` passes for shared contracts, API changes, and broad refactors.
- `npm run semantic:audit` passes for UI/design-system cleanup work.
- `npm run gds:audit` passes for GDS migration work and any delivery that changes UI, layout, theme, or design-system adoption state.
- Database-sensitive changes are verified with `npm run db:ping` when environment access is relevant.

## Product Language

- Use `athlete`, `trainer`, `admin`, and `check-in` in product-facing UI, docs, issues, and API descriptions.
- Avoid new product-facing use of legacy `child`, `children`, `assessment`, `conductor`, or `observer`.
- Legacy names may remain in compatibility layers, collection names, and migration code until explicitly migrated.

## Product Boundary

- Habigoal remains an independent white-label habitbuilder for any signed-in person and must not require Athlete IQ registration.
- Trainer, coach, admin, and staff sessions on Habigoal are personal routine sessions, not assigned-athlete management sessions.
- Selecting a trainer persona on Habigoal must not grant Athlete IQ access.
- Athlete IQ may consume Habigoal-created history only through explicit professional entitlement, assignment, and consent rules.

## Access Control

- Public pages are limited to landing, news, and legal routes.
- Personal-data routes require OAuth-backed session when `HABIGOAL_ENFORCE_AUTH=true`.
- Habigoal users can access only their own personal routine profile through Habigoal APIs.
- Athlete users can access only their linked athlete profile and own tasks.
- Trainer users access athletes through team membership.
- Admin-only settings and user/team management remain blocked from trainers and athletes.
- API authorization must match UI route gating.

## i18n

- User-facing strings belong in `/messages` or structured localized content.
- News/blog posts must render only in locales where that exact locale content exists.
- Do not introduce silent fallback from one user-facing language to another.
- `npm run i18n:audit` passes for changes that touch UI copy, message catalogs, news content, or report labels.
- Critical surfaces covered by the hardcoded-copy gate must keep visible text and accessibility labels in `/messages`, not inline JSX props/text.
- RTL locales (`ar`, `he`) must be checked for layout and action-label readability.
- Any new feature with visible copy must update all supported locale files or explicitly remain English-only in structured content that fails closed by locale.

## UI Quality

- Follow `/Users/Shared/Projects/general-design-system` as the design, UI, and UX source of truth.
- Treat `DESIGN.md` and `docs/design-system.md` as Habigoal adapter and migration documents only.
- Prefer GDS-governed provider, primitive, and admin contracts from `@sovereignsquad/gds`, with `@sovereignsquad/gds-eslint-config` and `@sovereignsquad/gds-compliance` as governance packages; keep Mantine usage as implementation detail only when the manifest documents a temporary adapter.
- Keep `gds-adoption.json` aligned with the consumed GDS version, required contracts, local adapters, approved exceptions, and migration state.
- Do not add new local token systems or generalized UI primitives that belong in GDS.
- Avoid nested cards and unnecessary decorative surfaces.
- Buttons and compact controls must keep text readable on mobile and RTL layouts.
- Personal-data pages should be efficient operating surfaces, not marketing pages.
- Scoring changes must include deterministic fixtures and must not fabricate missing athlete data through fallback logic.
- GDS migration work must follow the [GDS Verification Matrix](gds-verification-matrix.md).

## Data And Persistence

- New persisted data must have a clear collection, type, repository, API route, and access rule.
- Soft-delete/restore behavior must be documented when applicable.
- Writes should preserve compatibility with historical records where the codebase already supports legacy data.
- Validation should live in shared validation or schema code rather than ad hoc page logic.

## Documentation

- Update `README.md` when product capabilities, setup, commands, or environment variables change.
- Update `docs/api.md` when API routes, payloads, roles, or auth behavior change.
- Update `docs/deployment.md` when environment or deployment behavior changes.
- Update `docs/sso-setup.md` when auth behavior changes.
- Update `handover.md` when architecture, role boundaries, or current risks change.
- Update `ROADMAP.md` when shipped state or active roadmap themes change.

## Git And Automation

- Human-directed direct pushes to `main` are allowed when explicitly requested.
- Automated and AI-assisted changes use branch and PR delivery.
- Do not force push.
- Do not rewrite unrelated user changes.
- Commit only the scoped files needed for the task.

## Reporting

- Final summaries should state what changed, what validation passed, and any known remaining risk.
- Do not claim live production behavior unless it was deployed or verified on the live URL.
