# GDS Verification Matrix

Status: Active verification contract
Last updated: 2026-05-31

Use this matrix before and after each GDS migration slice. It is the operational smoke checklist for accessibility, route protection, locale/RTL behavior, UI states, and rollback safety.

`npm run gds:audit` is expected to pass on `main`. Do not claim a delivery is GDS-governed if this command or `npm run gds:compliance` fails.

## Automated Gates

Run before every GDS migration handover:

```bash
npm run gds:audit
npm run semantic:audit
npm run i18n:audit
npm run lint
npm run test
npm run typecheck
npm run build
```

Current expected state:

- `npm run gds:audit` must pass.
- `npm run gds:compliance` must pass for UI, layout, theme, or GDS adoption changes.
- `npm run semantic:audit` must pass.
- `npm run i18n:audit`, `npm run lint`, `npm run test`, `npm run typecheck`, and `npm run build` must pass for release-ready code.

## Route Smoke Matrix

| Surface | Route | Role | Expected Access | Primary GDS Contract | Required States | Accessibility Checks | Rollback Check |
|---|---|---|---|---|---|---|---|
| Landing | `/{locale}` | Public | Allowed | `PublicShell`, `EditorialHero`, `FeatureBand`, `PublicBrandFooter` | Loaded, missing locale, mobile CTA wrapping | Semantic heading order, CTA labels, visible focus, contrast | Revert public shell adapter only |
| News index | `/{locale}/news` | Public | Allowed | `PublicShell`, `ArticleShell` | Empty posts, localized posts, missing locale fail-closed | Article landmarks, link names, keyboard navigation | Restore previous news list component |
| News detail | `/{locale}/news/[slug]` | Public | Allowed only when exact locale content exists | `ArticleShell` | Not found, localized article, long content | Heading hierarchy, readable line length, RTL text flow | Restore previous article renderer |
| Legal | `/{locale}/legal/gtc`, `/{locale}/legal/privacy` | Public | Allowed | `DocsPageShell`, `ArticleShell` | Content loaded, missing content | Landmark structure, text contrast, link focus | Restore previous legal renderer |
| Athlete home | `/{locale}/athletes` | Athlete | Allowed only to linked athlete context when auth is enforced | `PublicShell` or athlete app shell contract | Loading, no linked athlete, own profile loaded | No other athlete data, keyboard CTA path, focus order | Restore previous athlete app page |
| Athlete profile | `/{locale}/athletes/[id]` | Athlete | Own profile only | `MetricCard`, `ProgressCard`, `StateBlock`, chart container exception | Loading, no history, chart data, API error | Chart fallback text, card headings, no color-only status | Restore previous detail component |
| Trainer dashboard | `/{locale}/dashboard` | Trainer/Admin | Allowed | `AppShell`, `WorkspaceHeader`, `MetricCard`, `StateBlock` | Loading, empty queue, support alerts, API error | Sidebar keyboard nav, action labels, status badge text | Restore previous dashboard shell/sections |
| Check-in | `/{locale}/dashboard/assessment` | Athlete/Trainer/Admin | Allowed based on linked athlete/team policy | `FormField`, `FormSection`, `SemanticButton` | Empty athlete, validation error, save error, success | Label/input association, error announcement, numeric input usability | Restore previous form adapter |
| Athlete management | `/{locale}/dashboard/athletes` | Trainer/Admin | Trainer scoped by team, admin global | `ResponsiveDataView`, `DataToolbar`, `StateBlock` | Loading, empty, filtered empty, deleted hidden | Search labels, card/table parity, keyboard row actions | Restore previous list component |
| Athlete detail | `/{locale}/dashboard/athletes/[id]` | Trainer/Admin | Trainer scoped by team, admin global | `MetricCard`, `ProgressCard`, chart container exception | No history, chart data, PDF action error | Chart labels, action focus, report button name | Restore previous detail renderer |
| Records | `/{locale}/dashboard/records` | Trainer/Admin | Trainer scoped by team, admin global | `ResponsiveDataView`, `DataToolbar` | Empty, filtered empty, loading, API error | Table/card headers, action names | Restore previous records list |
| Record detail | `/{locale}/dashboard/records/[id]` | Trainer/Admin | Scoped to accessible athlete/check-in | `ArticleShell` or report shell, PDF exception | Missing record, PDF generation error | Print/export action label, heading order | Restore previous record detail |
| Planning | `/{locale}/dashboard/planning` | Trainer/Admin | Trainer scoped by team, admin global | `FormSection`, `MetricCard`, `ResponsiveDataView` | Empty plan, save error, saved state | Date/input labels, button focus, mobile action stacking | Restore previous planning section |
| Settings | `/{locale}/dashboard/settings` | Admin | Admin only | `AppShell`, `ResponsiveDataView`, `FormSection`, `InfoCard` | Permission denied, empty users, save error, restore empty | Destructive confirmation, focus return, card/table parity | Restore previous settings section |

## Locale And RTL Matrix

Check at minimum:

| Locale | Direction | Required Checks |
|---|---|---|
| `en` | LTR | Baseline text, route structure, public/protected split |
| `hu` | LTR | Primary production language quality and long labels |
| `es` | LTR | No mixed English/Hungarian fallback |
| `de` | LTR | Long button and nav labels do not clip |
| `ar` | RTL | Sidebar/drawer direction, action order, chart labels |
| `he` | RTL | Button labels, status badges, table/card alignment |

## Accessibility Checklist

Every migrated GDS surface must satisfy:

- All interactive controls are reachable by keyboard.
- Focus state is visible and not clipped.
- Control text is available as an accessible name.
- Form fields have labels and errors linked to the field.
- Error, empty, loading, disabled, permission, and success states are visible without relying on color only.
- Destructive actions require confirmation.
- Reduced-motion preferences are respected when motion exists.
- Public pages use semantic landmarks and heading order.
- Protected pages do not expose personal data to unauthorized roles.

## Operational Failure States

For data-loading surfaces, verify:

- Network or API failure shows a visible error state.
- Retry is available where the user can reasonably recover.
- Save failures roll back optimistic UI changes.
- Long-running operations show pending/saving state.
- Delete/restore actions handle missing IDs and stale records.
- OAuth/session failure redirects or shows recovery without leaking data.

## Rollback Protocol

1. Revert the smallest migration commit or adapter layer.
2. Do not roll back database data unless a data migration explicitly changed persistence.
3. Restore `gds-adoption.json` adapter status to the actual runtime state.
4. Run:

```bash
npm run semantic:audit
npm run i18n:audit
npm run lint
npm run test
npm run typecheck
npm run build
```

5. Run the route smoke rows affected by the rollback.

## Handover Template

Each GDS migration PR must include:

- changed GDS contracts
- deleted local adapters, if any
- remaining exceptions
- commands run
- route smoke rows checked
- accessibility checks performed
- rollback notes
