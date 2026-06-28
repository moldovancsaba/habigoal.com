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

## Remaining hits — clear-cut (rewrite, no decision needed)

| Surface (key) | Current | Proposed |
|---|---|---|
| `Landing.subtitle` / `footerTitle` / `previewTitle` | "shared backend / separated product apps" | delete the unused keys |
| `Reports.rowMeta` | "{type} • {date} • rule-based guidance included" | "{type} • {date}" |
| `Reports.pdf.guidance` | "Rule-based guidance" | "Coach guidance" |
| `Dashboard.nextBestActionsSubtitle` | "Rule-based coach recommendations generated from today's check-in state and support pressure" | "Coach recommendations based on today's check-in." |

## Remaining hits — judgment call (need your ruling)

These use product terminology that may be intentional brand language rather than
jargon. Flagging rather than guessing:

- **"Digital Twin"** — appears as a user-facing feature name in `Dashboard`,
  `ParentPortal`, `AthleteIntelligence.twinDimensions`, `Reports.reportType`
  ("Full Digital Twin"), and the Wearables area. Options: (a) keep as the product
  feature name, or (b) rename to something plainer ("performance profile",
  "athlete profile"). Recommend (b) for parents/athletes, keep (a) only in
  trainer/pro contexts if desired.
- **"rule-based" / "not AI-generated" disclosures** (`Reports.subtitle`) — this is
  honest non-AI/non-medical disclosure, which has compliance value. Recommend
  keeping the *meaning* ("not a medical diagnosis") but dropping the engineering
  phrase "rule-based engine" → "coach guidance, not a medical diagnosis".

## Not jargon (keep)

- `Schema.testsema.title` "Body schema awareness" — sports-science term, not code.

## How to finish

1. Apply the clear-cut rewrites above (6 locales each) + delete the dead Landing
   keys.
2. Get a ruling on "Digital Twin" and the "rule-based" disclosures, then apply.
3. Add a lint/i18n guard: extend `scripts/i18n-audit.mjs` with a deny-list of
   engineering terms in user-facing namespaces so this cannot regress.
