# Product Audit — Open Issues vs. Implemented Code

**Date:** 2026-06-28 · **Scope:** all ~185 open issues (#2–#432) compared against the code on `main`.
**Method:** each issue's claimed scope was checked against routes/services/components to determine whether the business logic is actually wired end-to-end. Classification:

| Status | Meaning |
|---|---|
| **LIVE** | Implemented and wired end-to-end. |
| **PARTIAL** | Real implementation exists, defined gaps remain. |
| **STUB / NOT WIRED** | Code, types, UI or flags exist but the logic is fake / hardcoded / not connected — **misleading**. |
| **NOT DELIVERED** | No meaningful implementation. |
| **PLANNED** | Forward-looking spec, not expected to be built yet. |

> ⚠️ This is an **internal** document. It is generated from an automated code sweep and a few verdicts need spot-confirmation (noted inline). The client-facing view is `docs/product-roadmap.md`.

## 1. Headline

| Status | Count | % |
|---|---:|---:|
| LIVE | 44 | 24% |
| PARTIAL | 68 | 37% |
| STUB / NOT WIRED (misleading) | 23 | 12% |
| NOT DELIVERED | 47 | 25% |
| PLANNED (meta) | 2 | 1% |
| **Total** | **~185** | |

**The core product is real and working** — daily check-in, habits/streaks, readiness scoring, coach/team dashboards, parent view, wearable manual sync, reports, auth, the form registry, i18n, and the consumer mobile shell are all LIVE. **The risk is the long tail**: a large "Athlete IQ 2.0 / GameFlow / CogLeague / Enterprise" spec is mostly unbuilt, and ~23 issues present a feature that isn't actually wired.

## 2. Misleading — STUB / NOT WIRED (priority risk)

These render or imply a working feature, but the logic is fake, hardcoded, or disconnected. **Highest reputational/clinical risk first.**

| # | Feature | What's actually there | Why it's misleading |
|---|---|---|---|
| #350 | GPS ingestion (Catapult/StatSports) | `services/connectors/gps.connector.ts` returns **hardcoded** `total_distance: 7500, high_speed_running: 850`; `healthCheck` always `true` | Pro GPS metrics are constants, not real data |
| #192 / #353 | Vision pose / kinematics | `vision-ai.service.ts`: `jointsCount = frames+5`, `anomalyScore = fileSize < 5000 ? 0.45 : 0.05` | Movement analysis is **fabricated from file size** — no model |
| #191 / #354 | Video frame extraction | `lib/vision/frame-extraction.ts` only computes timestamps; no ffmpeg/decoder | Upload→queue exists but frames are never extracted |
| #189 | Vision object storage | imgbb endpoint hardcoded; S3/R2 support exists but disconnected | Storage pattern advertised, not used for vision media |
| #197 | Minor human-review workflow | `humanReviewRequired` flag set in engine | Flag set but **no review queue**; recs still delivered to minors |
| #201 | AI commentary marking | guidance appears in reports | Not labelled "AI-generated" → could be read as clinician advice |
| #210 | Queue / Local AI cluster | `queue.repository.ts` CRUD only | No worker/scheduler — enqueued jobs never run |
| #246 | Forecasting | none | "Predictive development" has no service/route |
| #254 | Explainability (input→rule→output) | reasoning keys in backend | Not exposed to UI — opaque to users |
| #262 | Cognitive-UX trait journey | none | Progression visualization not built |
| #265 / #266 / #268 | CogLeague cohorts / leaderboards / coach dash | types only; `rankingStatus: "disabled_until_partner_contract"` | Tournament/rewards/dashboards stubbed |
| #272 | GameFlow match classification | timeline types only | No classification engine |
| #285 | Academy OS player mgmt | function declared in `product-surfaces.ts` | No workflows/dashboards |
| #88 | Privacy-safe telemetry | `console.info` in a few routes | No telemetry schema/sink — instrumentation claimed, absent |
| #19 | Customizable dashboard widgets | none | Dashboard is hardcoded; no widget config |
| #43 | External stakeholder portal | `athleteiq-stakeholder.ts` type | No portal UI / benchmarking engine |
| #55 | Form-definition foundation | minimal field types | No persistence/versioning (superseded — see §5) |
| #73 / #74 / #75 | GDS admin data / form contracts / public shell | none / Mantine | Spec-only; GDS adapters not built |
| #152 | Admin governance forms | admin panels exist | Bypass the central form validation/audit contract |

## 3. Not delivered (47)

**Football analytics (GameFlow), entire suite:** #271, #273, #274, #275, #276, #277, #278, #279, #280, #281.
**CogLeague pilot/partner:** #269, #270.
**Enterprise / business ops:** #247 (Commercial SaaS), #248 (Methodology IP gov), #249 (Hardware stations), #250 (Pilot Ops), #286 (Operations), #287 (Partner CRM), #288 (Coach Education), #289 (Methodology Licensing), #290 (Investor Ops), #291/#210 (Local AI edge).
**Clinical / athlete-management:** #11 (Return-to-play), #12 (Growth/maturation), #24 (Custom-formula engine), #25 (Tablet/kiosk capture), #39 (Club hierarchy), #40 (School/absence admin), #41 (Finance/dues), #42 (Resource booking), #82 (Micro-skill benchmarks/PDA), #86 (Weekly snapshots/export), #256 (AI-coach nudges/narration).
**Adaptive UX façades & shells:** #404 (AdaptiveDialog), #405 (OverflowMenu), #406 (Disclosure), #407 (DataView), #408 (Desktop AppShell), #410 (migrate AIQ onto façades), #411 (consumer mobile/tablet shell — *note:* a basic bottom-nav consumer shell IS live via #337; #411's full rail/split program is not).
**Design-system / forms consolidation:** #56, #60, #61, #77.
**Identity / content:** #422 (locale persistence), #64 (athlete-only check-in shell — *partly* covered by #149/#156), #65 (auto release notes).

## 4. Partial (68) — representative gaps

Recovery trend UI (#6), structured injury/illness events (#10), testing-template library beyond FMS (#13), coach↔athlete templated nudges (#15), notes/evidence library (#20), bulk import/SDK (#23), weekly aggregation (#34), training-ops & match-center UIs (#36/#37), task workflows (#38), OIDC production (#203), GDPR erasure workflow (#205), guardian-consent age rules (#206), AI advisory enforcement at the API boundary (#207), confidence shown on all rec surfaces (#195), recovery composite from raw wearable+subjective/ACWR (#209), white-label standalone registration (#424), cookie-consent inventory + category gating (#423), design-token migration (#430), a11y consistency (#431), desktop keyboard/focus model (#409), onboarding per-persona journeys (#48/#49/#51). Full per-issue lines are in the audit working notes.

## 5. Cross-cutting inconsistencies

1. **Duplicate / superseded issues.** The centralized form system is tracked twice: #54–#61 (logged PARTIAL/NOT DELIVERED) is **superseded** by the delivered #147–#156 (LIVE). Recommend closing #54–#61 as duplicates to stop double-counting.
2. **"Code exists ≠ enabled."** A `CookieConsentBanner` (#423) and `scripts/seed-haho-ecosystem.mjs` (#427) exist in the tree, but consent isn't category-gated and the demo roster is **not currently seeded/visible** (the user reports it missing). Presence of a file is not delivery.
3. **Misleading completeness in product-surface registry.** `product-surfaces.ts` lists functions (e.g. CogLeague, Academy OS, GameFlow) with maturity flags that read as near-ready while the backing logic is stub/absent (#265/#266/#268/#285).
4. **Roadmap vs. product confusion.** Many "Athlete IQ 2.0" issues are genuine future strategy (#186–#291) intermixed in the open backlog with shippable product bugs — they should be visibly separated (done in the roadmap doc).

## 6. Recommended actions

1. **Relabel the 23 stubs** with a `status:stub-not-wired` label and a one-line "what's fake" note, so no stub is mistaken for delivered.
2. **Gate clinical/AI surfaces**: enforce the AI-advisory disclaimer + minor human-review (#197/#201/#207) before any vision/forecasting feature is shown — these are safety items.
3. **Replace fabricated outputs with honest empty states**: GPS (#350) and vision (#192/#353) should show "not yet available" rather than fake numbers.
4. **Close duplicates** (#54–#61) and **separate roadmap from product** (label `track:roadmap-2.0`).
5. **Seed & enable the demo ecosystem** (#427) so the live product can be validated visually.
6. Drive the partials to done in the dependency order shown in `docs/product-roadmap.md`.

---
_Backing per-issue verdicts (file evidence per issue) captured during the sweep; see the roadmap for the client-facing view._
