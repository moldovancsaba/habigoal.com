# Definition Of Done

Use this checklist for feature work, fixes, documentation updates, and automation-created branches.

## Build And Tests

- `npm run lint` passes.
- `npm run test` passes when code behavior changed.
- `npm run build` passes.
- `npm run typecheck` passes for shared contracts, API changes, and broad refactors.
- Database-sensitive changes are verified with `npm run db:ping` when environment access is relevant.

## Product Language

- Use `athlete`, `trainer`, `admin`, and `check-in` in product-facing UI, docs, issues, and API descriptions.
- Avoid new product-facing use of legacy `child`, `children`, `assessment`, `conductor`, or `observer`.
- Legacy names may remain in compatibility layers, collection names, and migration code until explicitly migrated.

## Access Control

- Public pages are limited to landing, news, and legal routes.
- Personal-data routes require OAuth-backed session when `HABIGOAL_ENFORCE_AUTH=true`.
- Athlete users can access only their linked athlete profile and own tasks.
- Trainer users access athletes through team membership.
- Admin-only settings and user/team management remain blocked from trainers and athletes.
- API authorization must match UI route gating.

## i18n

- User-facing strings belong in `/messages` or structured localized content.
- News/blog posts must render only in locales where that exact locale content exists.
- Do not introduce silent fallback from one user-facing language to another.
- `npm run i18n:audit` passes for changes that touch UI copy, message catalogs, news content, or report labels.
- RTL locales (`ar`, `he`) must be checked for layout and action-label readability.
- Any new feature with visible copy must update all supported locale files or explicitly remain English-only in structured content that fails closed by locale.

## UI Quality

- Follow the Habigoal design system in `DESIGN.md` and `docs/design-system.md`.
- Prefer existing Mantine patterns and shared components.
- Avoid nested cards and unnecessary decorative surfaces.
- Buttons and compact controls must keep text readable on mobile and RTL layouts.
- Personal-data pages should be efficient operating surfaces, not marketing pages.

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
- Autonomous Codex loops use branch and PR delivery.
- Do not force push.
- Do not rewrite unrelated user changes.
- Commit only the scoped files needed for the task.

## Reporting

- Final summaries should state what changed, what validation passed, and any known remaining risk.
- Do not claim live production behavior unless it was deployed or verified on the live URL.
