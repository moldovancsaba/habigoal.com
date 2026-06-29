# Placeholder Content Policy (#334)

The product is live-facing. Shipped surfaces must render **real data or an
explicit empty state** — never filler copy or synthetic "demo rows" disguised as
real records.

## Banned content (enforced in CI)

`tests/no-placeholder-content.test.ts` scans `app/`, `components/`, and
`messages/` and fails the build if it finds classic filler markers:

- `lorem`
- `ipsum`

These never have a legitimate use in product copy, so they are banned outright
across UI source and all six i18n catalogs.

## Why "demo" and "sample" are not banned wholesale

The issue's illustrative banned list mentions `demo` and `sample`, but in this
codebase those words have genuine, non-placeholder uses:

- The **demo seed ecosystem** (`scripts/seed-haho-ecosystem.mjs`, #427) creates
  real, coherent Mongo records for end-to-end demonstrations — these are live
  rows, not placeholders.
- **Example inputs** such as `user@example.com` or a sample season string like
  `2025/26` are form-guidance placeholders, which are explicitly allowed (see
  below).

Banning them wholesale would produce false positives, so the guard targets only
the unambiguous filler markers above.

## Allowed placeholders (form guidance only)

Semantic placeholders are allowed **only** as input guidance, never as data
payload rendered to the user:

- Form input `placeholder` hints (e.g. `user@example.com`, `2025/26`,
  `U13 Blue`) — these go through `next-intl` keys where user-facing.
- Confirmation keywords (`delete` / `restore`) that are compared literally and
  must not vary by locale.

## Empty states, not fake cards

When a dataset is missing, surfaces must show a clear empty state with an
actionable CTA (e.g. data import) — never a placeholder card, even on error.
This complements the wire-or-hide / honest-state principle in
`docs/remediation-plan.md`.
