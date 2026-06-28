# Non-user / misleading copy audit

Goal: remove implementation and architecture language from user-facing surfaces,
and make the landing page a pure selector + legal page. Grounded in a scan of all
six locale catalogs for engineering terms (backend, product app, pipeline,
schema, canonical, normalisation, rule-based engine, telemetry, webhook, payload,
capability keys, P0/P1, stub, digital twin, projection, orchestration).

## Done in this change

- **Landing page is now selector + legal only.** Removed the brand header
  (Habigoal logo + name on top — misleading on a neutral two-app selector) and
  the developer copy. Footer is now just Terms + Privacy. Kept: the selector
  title, the two app cards, the locale/theme controls, and "What's new".
  - Eliminated from the UI: `Landing.subtitle` ("One shared backend powers two
    separated product apps…"), `Landing.footerTitle` / `Landing.previewTitle`
    ("Separated product apps"), `Landing.ssoNote`. (Keys remain in the catalog
    unused; safe to delete in a follow-up.)
- **Wearables.subtitle** reworded from "Connect devices for daily telemetry into
  your Athlete Digital Twin" → "Connect your devices so daily readings flow into
  your performance profile." (all 6 locales).

## Resolved (per owner rulings)

- **Dead Landing keys deleted** (`subtitle`, `footerTitle`, `previewTitle`,
  `ssoNote`, `brandSubtitle`) from all 6 locales.
- **"Digital Twin" — keep for pros only.** `ParentPortal.digitalTwin` →
  "Performance profile" (athlete/parent-facing). Kept as the feature name on the
  pro surfaces (`Dashboard.digitalTwin`, `AthleteIntelligence.twinDimensions`,
  `Reports.reportType` "Full Digital Twin"). The athlete (AIQ) workspace never
  used the term.
- **AI / rule-based disclosure — removed entirely** from user copy:
  - `CoachHub.subtitle` — dropped "AI-generated".
  - `Reports.subtitle` — dropped "rule-based engine guidance (not AI-generated)".
  - `Reports.rowMeta` → "{type} • {date}" (allowlisted as identical-OK).
  - `Reports.pdf.guidance` → "Guidance".
  - `Dashboard.nextBestActionsSubtitle` — dropped "rule-based".
- **Wearables.subtitle** — dropped "telemetry / Athlete Digital Twin".

## Not jargon (keep)

- `Schema.testsema.title` "Body schema awareness" — sports-science term, not code.

## Future guard (optional)

Extend `scripts/i18n-audit.mjs` with a scoped deny-list of engineering terms in
user-facing namespaces (excluding the allowed pro "Digital Twin" and
"body schema") so this cannot regress. Deferred to avoid false positives in CI.
