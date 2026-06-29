# Remediation Low-Level Design & Delivery Plan

**Goal:** fix every gap from `docs/product-audit.md` so Habigoal (consumer) and Athlete IQ (professional) work fully **as intended** — no fabricated data, no unwired logic, every shown feature backed by real, safe behaviour.

**Companion docs:** `docs/product-audit.md` (what's broken), `docs/product-roadmap.md` (client view), `docs/adaptive-system-design.md` (adaptive UX).

## 0. Principles (apply to every item)

1. **No fabricated data, ever.** A surface either shows real data or an honest empty/"not available yet" state. Delete every hardcoded/placeholder metric.
2. **Wire-or-hide.** A feature is either fully wired end-to-end or hidden behind a capability flag. No half-features rendered as if working.
3. **Capability flags are the seam.** Each not-yet-real capability gets a flag in `config/env.ts`; UI reads a single `capabilities` contract. Off → honest state; on → real implementation.
4. **Safety first for AI & minors.** No AI/derived guidance reaches an end-user (especially a minor) without the advisory label and, where flagged, human review.
5. **One source of truth.** Reuse the canonical metric / shared-profile contract and the streak/scoring helpers; never re-implement logic per surface.
6. **Every fix ships with tests + i18n parity + honest UX states**, per the #81 standard.

## 0.1 Scope

- **In scope (Phases A–D):** everything needed to use both apps as intended — the 23 misleading stubs, the use-blocking partials, and the core not-delivered athlete/coach features.
- **Deferred track (Phase E, roadmap only):** strategic/enterprise modules not required for app use — GameFlow football analytics (#271–281), CogLeague league ops (#264–270), Operations/CRM/Education/Licensing/Investor (#286–290), Hardware (#249), Commercial SaaS (#247). These get **honest "Exploratory" UI removal/hiding** now and full design later.

---

# PHASE A — Honesty & Safety foundations (build first)

These are cross-cutting and unblock everything else. Highest priority because they remove trust/safety risk.

## A1. Background job worker runtime  (fixes #210; unblocks vision, async AI, reminders, snapshots)

**Current:** `repositories/queue.repository.ts` already implements `enqueueJob`, `claimNextPendingJob(workerId)`, `completeJob`, `failJob` with locking. **What's missing is a process that drains the queue** — jobs are enqueued and never run.

**Design**
- **Handler registry:** `lib/jobs/registry.ts` → `Map<QueueJob["type"], (job) => Promise<void>>`. Register handlers: `generate_ai_insight`, `vision_analyze`, `frames_extract`, `weekly_snapshot`, `reminder_dispatch`.
- **Drain endpoint:** `app/api/internal/jobs/drain/route.ts` (POST). Guarded by `x-internal-token === env.internalJobToken`. Loop: `for i in 0..BATCH(=10): job = claimNextPendingJob(workerId); if !job break; try handler(job); completeJob else failJob(job, err, maxAttempts)`. Returns `{claimed, completed, failed}`. Idempotent; safe to call concurrently (atomic claim).
- **Scheduler:** `vercel.json` cron → `*/1 * * * *` POST to the drain endpoint (or external worker calling the same endpoint). Document a local `npm run jobs:drain` for dev.
- **Observability:** each run emits a telemetry event (A4) `event:"jobs.drain"` with counts + latency.
- **Config:** `env.internalJobToken`, `env.jobDrainBatchSize`.

**Data model:** existing `types/queue.ts` (`QueueJob`, `JobStatus`); add `lastError?`, `completedAt?`.
**UX:** none directly; surfaces that depend on async work show "processing" until the job completes (A2 states).
**Tests:** unit on the drain loop with a fake registry (claims, retries to maxAttempts→`failed`, lock-expiry re-claim); integration that an enqueued job transitions pending→completed.
**Acceptance:** an enqueued job runs within one cron tick; failures retry then dead-letter; no job runs twice concurrently.

## A2. Capability flags + honest-state contract  (foundation for wire-or-hide)

**Design**
- `config/env.ts`: add typed flags, default **off** where not real: `visionAiEnabled`, `gpsIngestionEnabled`, `forecastingEnabled`, `aiCoachNudgesEnabled`, `cogLeagueEnabled`, `gameFlowEnabled`, `telemetryEnabled`.
- `lib/capabilities.ts`: `getCapabilities(user)` → `{ visionAi, gps, forecasting, ... }` resolving env flag AND entitlement. Single import for server + a `/api/capabilities` for the client (cached).
- `components/common/FeatureGate.tsx`: `<FeatureGate cap="visionAi" fallback={<NotAvailableYet/>}>…</FeatureGate>`.
- `components/common/NotAvailableYet.tsx` (GDS `StateBlock`): localized "This feature isn't available yet" — replaces any fabricated output.

**Tests:** `getCapabilities` truth table; gate renders fallback when off. **Acceptance:** every Phase-A/E "not real" feature renders the honest state, never fake data.

## A3. AI safety & governance enforcement  (fixes #197, #201, #207, #254)

**Current:** `lib/engines/recommendation.engine.ts` returns `humanReviewRequired` + `advisoryDisclaimer` + `reason`, but **nothing enforces or surfaces them**; minors still receive raw recs.

**Design**
- **Review queue:** new collection `coach_review_queue`; `repositories/coach-review.repository.ts` (`enqueueReview`, `listPending(scope)`, `resolveReview(id, decision, reviewerId)`). `types/coach-review.ts`: `{ id, athleteId, kind:"recommendation"|"vision"|"forecast", payload, status:"pending|approved|modified|rejected", createdAt, reviewedBy?, decisionNote? }`.
- **Gating service:** `services/recommendation-delivery.service.ts` → `deliverRecommendation(rec, athlete)`: if `rec.humanReviewRequired` (incl. `isMinor`) → persist to review queue, return a **withheld** projection (`status:"awaiting_review"`); else return the rec. End-user (athlete/parent) surfaces call this, never the raw engine.
- **Advisory label everywhere:** a shared `<AdvisoryNote/>` (GDS) rendered on every recommendation/guidance surface (daily plan, reports, mobile). Reports (`lib/pdf-service.ts`, `services/reporting.service.ts`) prefix AI/derived commentary with a localized "AI-assisted guidance — not medical advice" marker (#201).
- **Explainability (#254):** expose `rec.reason` + `contributingFactors` via a `<WhyThis/>` disclosure on each rec surface; add `GET /api/athleteiq/recommendations/:id/explain` returning input→rule→output.
- **Coach review UI:** `app/[locale]/dashboard/review/page.tsx` — pending queue, approve/modify/reject; approval releases the withheld rec.

**Tests:** minor → withheld + queued; high-risk → queued; approve → released; every rec surface includes the advisory marker (snapshot/string test). **Acceptance:** no minor/high-risk rec is delivered unreviewed; all guidance is labelled.

## A4. Privacy-safe telemetry  (fixes #88)

**Design:** `lib/telemetry.ts` → `track(event, {correlationId, props})`; PII-stripped (allowlist of prop keys; never email/name). Sink: `telemetry_events` collection via `repositories/telemetry.repository.ts`, gated by `env.telemetryEnabled` + consent category (A2 + #423). Replace ad-hoc `console.info` in reflection/session/job routes. **Tests:** PII keys dropped; disabled flag → no-op. **Acceptance:** events recorded with no PII; respects consent.

## A5. Demo ecosystem seed + enable  (fixes #427 — unblocks visual verification of everything)

**Current:** `scripts/seed-haho-ecosystem.mjs` exists but the roster isn't present.

**Design:** make the script create, idempotently and via the real services/write-paths: trainers `trainer1..5@haho.ai`, athletes `athlete{T}{1..5}@haho.ai` (25), trainer↔athlete links, and **seeded-random historical data** (fixed seed for reproducibility) across a 60–90 day window — check-ins, habits (so streaks/charts populate), readiness, sessions. Add `npm run db:seed-haho-ecosystem` (exists) + a teardown `db:reset-haho-ecosystem`. Document env/DB target. **Tests:** generator is deterministic + in-range; re-run = one roster (idempotent upsert by email + day key). **Acceptance:** after seeding, both apps render populated dashboards/streaks for the roster.

---

# PHASE B — "Use as intended" completion (core partials)

## B1. Wearables & GPS  (fixes #350, #283, #6, #209)
- ✅ #6 delivered (interpretation engine): `lib/recovery-trend.ts` `interpretRecoveryTrend(series)` turns a daily recovery-score series into a direction (improving/stable/declining/insufficient), rolling average, delta %, and a plain-language interpretation key in the new `Recovery` i18n namespace (all 6 locales), plus a readiness-influence signal (boosts/neutral/reduces). Pure + tested (`lib/recovery-trend.test.ts`); consuming surfaces supply real series (no fabrication). Trend chart rendering is the remaining UI surface.
- **Remove fabricated GPS payloads.** `services/connectors/gps.connector.ts`: `fetchMetrics` returns `[]` and `healthCheck` returns `false` unless `env.gpsIngestionEnabled` + provider credentials present. When enabled, implement real ingestion: Catapult/StatSports CSV/API parse → `RawPayload` → existing `lib/wearable-ingestion.ts` normalisers. Add `services/connectors/__tests__` with real fixture parsing.
- **Testing-tool ingestion (#283):** VALD/force-plate CSV adapter behind `gpsIngestionEnabled` sibling flag.
- **Recovery trend UI (#6) + composite/ACWR (#209):** `lib/engines/recovery.engine.ts` compute ACWR from wearable load + subjective; surface 7/28-day trend in the recovery panel. **Acceptance:** no GPS numbers unless a real source is connected; recovery trends render from real series.

## B2. Digital Twin & Vision  (fixes #188–194, #202, #353, #354)
- **Stop writing fabricated vision data.** `services/vision-ai.service.ts`: delete `jointsCount = frames+5` / `anomalyScore = fileSize<5000?…`. Gate the whole pipeline on `visionAiEnabled`. When **off**: media is stored, status `analysis_unavailable`, **no twin mutation**, UI shows `NotAvailableYet`. When **on**: `frames_extract` job (real ffmpeg/worker on the compute layer, Phase E dependency) → `vision_analyze` adapter (`lib/vision/provider.ts` interface; real model) → persist `vision_analyses` with genuine confidence/limitations → `updateTechnicalFromVision` only with real output.
- **Object storage (#189):** route vision uploads through `lib/media-storage.ts` (S3/R2), not imgbb.
- **Twin sources (#202):** wire check-in + FMS + AI engine outputs into `lib/twin-updater.ts` with per-dimension confidence + `sourceCollections`.
- **Acceptance:** with vision off (default), no fake twin values exist anywhere; twin shows only real, sourced dimensions.

## B3. Identity & White-label  (fixes #424, #422, #203)
- **Standalone Habigoal registration (#424):** remove the `productSurface==="habigoal" && !existingUser` block in `app/api/auth/login/route.ts`; rely on existing `createSelfRegisteredEntitlements()` + lazy profile; strip AIQ branding/copy from the Habigoal login (separate `Login` message subtree); project consumer entitlements to `{habigoal:{enabled}}`. Replace the auth test that locks the old behaviour. (Builds on the merged PII fix #432.)
- **Locale persistence (#422):** write a `NEXT_LOCALE` cookie from the language switcher; `middleware.ts`/next-intl negotiation reads it before `Accept-Language`; root + locale-less redirects honour it. (Respect consent category.)
- **OIDC production (#203):** add discovery-metadata validation + claims hardening in `services/auth-service.ts`; keep local allow-list fallback behind a flag.

## B4. Privacy, consent & compliance  (fixes #205, #206, #423)
- **GDPR erasure (#205):** complete `services/privacy.service.ts` erase path (cascade across canonical metrics, habit records, media, twin, reviews) + audit event; `POST /api/athletes/:id/erase` with role + confirm-keyword.
- **Cookie consent gating (#423):** category model (`necessary|functional|analytics`); `ConsentProvider` exposes categories; telemetry (A4) + locale cookie (B3) check it; commit `docs/cookies.md` inventory. Rebuild the existing banner/modal on GDS (folds in #431's ConsentModal item).
- **Guardian consent & age rules (#206):** ✅ delivered — `resolveGuardianRequirement(birthDate, requested)` makes the age rule authoritative server-side: an athlete below `YOUTH_AGE_THRESHOLD` always requires guardian consent and the request body can only strengthen (never waive) it. Wired into `POST /api/athletes/:id/consents` so a minor can't be downgraded via `guardianRequired:false`; covered by `tests/age-consent.test.ts`. Consent validity (`lib/consent.ts`) already blocks data sharing until guardian approval, and minor rec delivery is gated via A3.

## B5. Reports  (fixes #34, #86, #198–201)
- **Weekly snapshots (#34/#86):** `weekly_snapshot` job (A1) builds `WeeklyAthleteSnapshot` (collection + repo) every Monday; versioned; export in PDF/CSV/JSON. **AI labelling (#201)** via A3. Team-report depth (#198) — sub-team/position breakdowns; consistent role checks (#199).

## B6. Notifications  (fixes #257)
- Wire session/reflection reminder types into `reminders.service.ts` + `reminder_dispatch` job (A1) + the `DailyReminders` UI; per-type enable in settings.
- ✅ delivered (policy layer): `reminders.service.ts` now applies a deterministic, timezone-aware delivery policy before surfacing nudges — `isWithinQuietHours` (quiet-hours window, wraps midnight), `applyReminderPolicy` (quiet-hours suppression + `maxConcurrent` cadence cap), and `localHourInTimezone`. `ReminderPreferences` typed in `types/reminder.ts`. Defaults are a no-op so the lite derive-on-read behaviour is preserved; covered by `reminders.service.test.ts`. **Future (active/lite/future truth model):** push/email transport via the `reminder_dispatch` job, preference persistence in settings UI, and the broader session/recovery/learning categories + coach escalation remain to be wired.

## B7. Forms & platform hygiene  (fixes #150, #152, #153, #156, #334; closes #54–61)
- Migrate admin/profile forms onto the central form contract (#150/#152); enforce server+client validation parity gate (#153) in a shared `validateCentralForm` middleware on all POST handlers; finish athlete-only check-in route split + deprecate legacy (#156); remove remaining placeholder data (#334). **Close #54–61 as superseded by the delivered #147–156.**
- ✅ #156 delivered: dedicated athlete-first check-in shell at `/[locale]/athletes/checkin`. `lib/athlete-checkin-access.ts` `resolveCheckinShellAccess(user)` is the pure role/redirect rule (athlete + linked `athleteId` → render; non-athlete → `/dashboard`; athlete without profile or anonymous → `/`). The route self-resolves the signed-in athlete and renders the existing contract-backed `AthleteCheckInApp`, keeping the legacy per-id route `/athletes/[id]/check-in` operational for coach/admin flows. Covered by `lib/athlete-checkin-access.test.ts`.
- ✅ #153 delivered: cross-layer validation gateway `lib/forms/validation.ts` — `validateContract(fields, values)` derives the same checks (required / invalid_type / out_of_range) from a `CentralFormField` contract for both client and server, returning the normalized `{ field, code, messageKey }[]` error shape. A `FORM_CONTRACTS` registry maps form ids → contracts (`getFormContract`), and the optional debug/CI endpoint `POST /api/forms/validate` runs the gateway server-side (read-only). Covered by `lib/forms/validation.test.ts` + the route test.
- ✅ #150 delivered: athlete profile is now a single-source contract in `lib/forms/central-form.ts` — `athleteProfileFields`, the `ATHLETE_PROFILE_STATUSES` enum (`isAthleteProfileStatus` guard) and `ATHLETE_PROFILE_FIELD_LIMITS`. The admin panel (`AthleteProfileAdminPanel`) and the server route (`PATCH /api/athletes/:id/assignment`) both consume these constants, so the status enum and field caps can no longer drift between client and server. Covered by `lib/forms/central-form.test.ts`.
- ✅ #152 delivered (backend; UI stays in GDS per the issue constraint): policy-safe admin governance action surface. `types/admin-action.ts` defines the `GovActionPayload` contract, `GOV_ACTIONS` (`grant_role`/`revoke_role` — only the mutations the user store actually backs, no fabricated suspend/flag) and `GOV_ASSIGNABLE_ROLES` (excludes `admin`, so the API can't self-escalate). `lib/admin-actions.ts` holds pure `validateGovAction` + idempotent `computeNextRoles`. `POST /api/admin/actions` is admin-only (`requireRole`), validates against the contract, is **audit-first** (records `admin.governance` via `insertAuditEvent`; aborts with 502 if the audit write fails — no governance mutation applied), then applies real role changes via the new `setUserRoles` repo function. Covered by `lib/admin-actions.test.ts` + `app/api/admin/actions/route.test.ts`.

---

# PHASE C — Adaptive UX program (fixes #404–411, #430, #431, #73–77)

Per `docs/adaptive-system-design.md`. Build the façade family then migrate surfaces:
- **C1 Façades (#404–407):** `<AdaptiveDialog>` (modal↔bottom-sheet), `<OverflowMenu>` (menu↔drawer), `<Disclosure>` (tooltip↔tap), `<DataView>` (table↔cards) — width-channel layout + capability-channel affordances, on GDS, ARIA-preserving.
- **C2 Desktop shell + keyboard model (#408/#409):** AIQ AppShell, command palette (Cmd/Ctrl-K), roving tabindex/focus registry.
- **C3 Consumer mobile/tablet shell (#411/#410):** bottom-tab + tablet rail/split; migrate AIQ + Habigoal surfaces onto the façades.
- **C4 GDS completion (#73/#74/#75/#77):** GDS public shell, admin data views, form-field contracts; retire local CSS authority.
- **C5 Token & a11y consistency (#430/#431):** migrate hardcoded radii/colour/spacing/shadows to tokens; language-selector label + remaining a11y.

_Dependency: C1 blocks C2/C3; C3 blocks the AIQ migration (#410)._

---

# PHASE D — Extended athlete & coach management

- **D1 Clinical:** Return-to-play staging (#11) — `rtp_stages` model + progression API + UI; structured injury/illness/mental events (#10) replacing opaque flags; injury-flag RBAC (#182).
- **D2 Development:** Growth & maturation tracking for youth (#12); micro-skill benchmarks + PDA ranking (#82); benchmarks/sports-lab UIs (#243/#244); testing-template library (#13).
- **D3 Coaching workflows:** risk-scan alerts (#84) from real engine output; task-assignment workflows (#38); templated, readiness-triggered nudges (#15); notes/evidence library (#20).
- **D4 AI depth:** confidence on all surfaces (#195), forecasting (#246, gated), AI-coach nudges/narration (#256, gated + A3), cognitive-UX trait journey (#262), org-configurable check-in questions admin (#184).

---

# PHASE E — Deferred / Exploratory (honest-hide now, design later)

GameFlow (#271–281), CogLeague league ops (#264–270), Academy OS (#285), Operations/CRM/Education/Licensing/Investor (#286–290), Hardware (#249), Commercial SaaS (#247), Local-AI edge cluster (#291/#210-compute).
- **Now:** hide behind capability flags (A2); remove any stub UI/maturity flags from `product-surfaces.ts` that imply readiness; show "Exploratory — coming later" only where discoverable. **No fabricated functionality remains.**
- **Later:** full low-level design per module when scheduled. (Note: the **Local-AI compute layer** is the hard dependency for real Vision AI (B2) and Forecasting (D4) — until then those stay flag-off.)

---

# Sequencing & dependencies

```
A1 worker ─┬─► B2 vision  ─┐
           ├─► B5 snapshots │
           └─► B6 reminders │
A2 flags ──┬─► (wire-or-hide everywhere) ─► E honest-hide
A3 safety ─┴─► B2 vision / D4 AI delivery
A4 telemetry ─► B4 consent gating
A5 seed ──► visual verification of B/C/D

B3 white-label (needs shared profile contract ✓ + #432 ✓)
C1 façades ─► C2 desktop, C3 mobile ─► C3→ #410 AIQ migration
E Local-AI compute ─► real B2 vision + D4 forecasting
```

**Recommended order:** A1 → A2 → A3 → A5 (verify) → A4 → B3 → B1/B2(honest-off) → B4 → B5/B6 → B7 → C1→C2/C3→C4/C5 → D1→D4 → E.

# Issue hygiene (do alongside Phase A)
1. Close #54–#61 as **superseded** by #147–#156.
2. Label the 23 stubs `status:stub-not-wired` with a one-line "what's fake" until fixed.
3. Label the Exploratory set `track:roadmap-2.0` to separate strategy from shippable product.
4. File the new foundation issues (worker runtime, capability framework, AI-safety gating, telemetry, demo-seed) and link as dependencies.

# Definition of done (whole programme)
- No surface renders fabricated/hardcoded data (grep guards in CI).
- Every shown feature is wired or flag-hidden with an honest state.
- No AI/derived guidance reaches a minor/high-risk case without review; all guidance labelled.
- Demo roster seeds and both apps are fully navigable and populated.
- Each item lands with tests, i18n parity (6 locales), a11y, and docs — per the #81 standard.
