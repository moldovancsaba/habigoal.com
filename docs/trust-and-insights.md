# Trust & Insight Engines

This document describes the three reusable engines that keep Habigoal / Athlete IQ
honest about *how much it knows*, *why it says what it says*, and *what is safe to
share with a parent*. All three are pure, deterministic, unit-tested modules with
no fabricated data: every output is derived from real recorded signals only.

| Engine | Module | Issue | Surfaces wired |
| --- | --- | --- | --- |
| Data confidence | `lib/data-confidence.ts` | #253 | Athlete detail, Reports hub |
| Explainability | `lib/explainability.ts` | #254 | Athlete detail |
| Parent-safe report | `lib/parent-safe-report.ts` | #261 | Reports hub |

## 1. Data confidence (#253)

`classifyDataConfidence(input)` grades how trustworthy a derived figure is, instead
of presenting every number with equal authority.

- **Input:** `{ sampleSize?, sourceCount?, lastUpdatedAt?, now, missingSignals?, freshness? }`
- **Output:** `{ band, freshness, sampleSize, sourceCount, reasonKeys }`
- **Bands:** `high | medium | low | none` (ranked by `CONFIDENCE_BAND_RANK`).
- **Rules:**
  - No sample (or missing freshness) → `none` with reason `missingData`.
  - `sampleSize >= 7` and `sourceCount >= 2` → `high`.
  - `sampleSize >= 3` → `medium`; otherwise `low`.
  - Stale data downgrades the band by one step.
- **Reasons** (`ConfidenceReasonKey`): `missingData`, `lowSample`, `singleSource`,
  `multiSource`, `stale`, `fresh`. Each maps to an i18n key under
  `DataConfidence.reasons.*`.

Helpers: `normalizeConfidenceBand()` (coerces arbitrary strings such as
`"insufficient"` to a canonical band), `minConfidenceBand()`, and
`classifyFreshness()`.

**UI:** `components/insights/ConfidenceBadge.tsx` renders the band as a coloured
`Badge` (green / yellow / orange / gray) with the reasons in a tooltip, localized
via the `DataConfidence` namespace.

## 2. Explainability (#254)

`buildExplanation(facts, rules?, catalogVersion?)` makes recommendations
transparent and auditable: a versioned catalog of deterministic rules, returning
the exact **input → rule → output** bundle that fired.

- **Catalog:** `READINESS_RULES` with stable ids and semantic versions, e.g.
  `readiness.missingData`, `readiness.zone.good|moderate|fatigued|compromised`,
  `injury.riskElevated`. `RULE_CATALOG_VERSION` tracks the catalog as a whole.
- **Facts:** `readinessScore` (0–100), `missingSignalCount`, `injuryRisk` (`"high"`).
- **Output:** `ExplanationBundle { catalogVersion, appliedRules[] }`; each
  `AppliedRule` carries `ruleId`, `ruleVersion`, `descriptionKey`, `outputKey`, and
  the input snapshot it read.
- Rules are deterministic and evaluated **before** any AI/model-assisted layer.

**UI:** `components/insights/ExplanationPanel.tsx` renders each applied rule as a
plain-language description plus the action it yields, with the rule id + version in
the element title for traceability. Localized via the `Explainability` namespace.

## 3. Parent-safe report (#261)

`toParentSafeReport(report, options?)` projects a full coach `AthleteReport` into an
encouraging, privacy-respecting summary for parents.

- **Redaction:** any metric whose label matches `/injury|risk|clinic|medical|pain|load ratio|acwr/i`
  is withheld and listed in `coachOnlyKeys` — transparent, not silently dropped.
- **No leakage:** coach notes and engine/clinical guidance never reach the parent
  projection.
- **Honest tone:** `encouragementKey` is driven by the confidence band — `strong`
  (high) / `steady` (medium) / `building` (low/none). Thin data never produces a
  falsely strong claim.

**UI:** the Reports hub (`app/[locale]/dashboard/reports/page.tsx`) shows a
`ConfidenceBadge` per report row (band parsed from the report's `Confidence: …`
source note) and offers a **Parent-safe** export that downloads the redacted
projection. Localized via the `ParentSafeReport` and `Reports` namespaces.

## 4. Source-linked guidance signals (#81)

`buildAthleteInsights(input)` (`lib/athlete-insights.ts`) turns real athlete
inputs into a small set of deterministic, versioned **guidance** signals — each
carrying the source records it was derived from, for transparent disclosure.

- **Inputs (real only):** readiness/operating score, recovery-habit gap,
  training-load ratio, and the athlete's own reflection focus.
- **Signals:** `load_management`, `readiness_recovery`, `recovery_habit`,
  `tomorrow_focus`. Each has a severity (`low|medium|high`), an i18n `bodyKey` +
  params, and a non-empty `sources[]` (`check_in | habit_record | training_load |
  reflection`). `INSIGHT_RULE_VERSION` stamps every signal.
- **Ordering (deterministic):** safety/load → readiness recovery → recovery habit
  → reflection focus; higher severity first within a kind.
- **No fabrication:** a signal only fires when its real input crosses a threshold;
  a blank reflection produces nothing.

Distinct from the explainability catalog (#254, which explains the *current
status*); this layer produces forward-looking guidance. **UI:**
`components/insights/InsightSignalsPanel.tsx` renders each signal with a severity
badge and an accessible source disclosure, wired into the athlete operating
surface's **Analysis** area. Localized via the `AthleteInsights` namespace.

## Design principles

- **No fabricated data.** Engines only ever describe signals that were actually
  recorded. Missing data yields `none`/`building`, never an invented figure.
- **Honest gating.** Confidence and explanation degrade gracefully; they never
  overstate certainty.
- **Pure & tested.** Each engine ships with unit tests
  (`lib/*.test.ts`) and is framework-agnostic, so the same logic can back any
  surface (coach, athlete, report, future API).
- **i18n-complete.** All copy lives in the six locale catalogs and is covered by the
  i18n audit.
