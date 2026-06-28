# Implementation plan — enabling the remaining business logic

Status date: 2026-06-28. Grounded in a codebase inventory (not the issue titles).

## Current state

- **~70% REAL** — wired to MongoDB with rule-based computation (check-in, digital
  twin, daily IQ/engine, daily plan, pain alerts, reflections, lite modules,
  reports, forms core, teams, messaging, coach actions, audit, onboarding, queue).
- **~25% GATED** — code is real but fails closed without external config/creds
  (wearables Oura/Whoop/Garmin/Vald, media upload via ImgBB, SSO).
- **~5% BLOCKED** — needs an ML model or object storage (vision pose/video).
- Plus targeted **UI/display bugs** on otherwise-real features.

"Enabled" = code + tests + i18n + docs + merged to `main` + visibly working
behind login.

---

## Workstream 0 — User-facing bug fixes (quick wins, no external deps)

### W0.1 — AIQ Daily Plan renders "Title" placeholder cards  ⟵ reported
The daily plan is real, but the panel shows a column of identical cards titled
literally "Title", with English "Save"/"Edit" buttons and a clipped badge.
Root causes & fixes:
- **Missing title i18n.** `lib/athleteiq-daily-plan.ts` points habit tasks at
  `athleteiq.dailyPlan.habits.<key>.title` and lite tasks at
  `athleteiq.dailyPlan.tasks.<module>.title`, none of which exist → the resolver
  humanises `…title` to "Title". Add per-habit and per-lite-module titles (and
  ideally per-habit descriptions so cards differ) across all 6 locales.
- **Untranslated buttons.** `AiqDailyPlanPanel` `SemanticButton`s show the
  built-in English action label and ignore the localized children. Pass a
  vocabulary pack (as `AthleteIqExperience` does) or use localized buttons.
- **Mobile overflow.** The row card/badge overflows on narrow screens — apply
  the width-safe pass (see W0.2).

### W0.2 — AIQ mobile shell (#337)
Apply the touch-target / overflow / input-ergonomics pass already shipped for
Habigoal (#387) to the AIQ panels: ≥44px targets, no horizontal overflow,
thumb-friendly controls, sticky nav behavior.

### W0.3 — Remove remaining dummy/placeholder content (#334, #339, #338)
Audit every surface for non-live data, demo copy, and placeholder charts; enforce
live-only datasets and data-driven visuals.

---

## Workstream A — Enable gated-but-ready features (need config/creds)

The code exists and is unit-tested; it needs credentials + a live verification.

- **Wearables** Oura / Whoop / Garmin / Vald (#4, #242, #186, #187, #209, #202):
  set `OURA_*`, `WHOOP_*`, `GARMIN_*`, `VALD_WEBHOOK_SECRET`; verify a live sync
  end-to-end; surface last-sync time + graceful missing-data states.
- **Media / object storage** (#188, #189): provide `IMGBB_API_KEY`, or move to an
  S3-compatible store (prerequisite for the vision video pipeline).
- **SSO** (#203): optional; set SSO creds to enable OIDC alongside email login.

> Action needed from you: which wearable providers to enable first, and whether
> media goes ImgBB (fast) or S3 (production).

---

## Workstream B — New business logic, buildable now (no external deps)

Prioritized by user value:

- **B1 Teams: invitations + role expansion** (#63, #151, #336, #211, #333):
  trainer↔athlete invite workflow; expand from 3 effective roles to the full
  5-role model with RBAC enforcement.
- **B2 Reports & weekly summaries** (#86, #261, #34, #198–#201): versioned
  snapshots, role-scoped team reports, authorized export, AI-commentary marking,
  parent-safe summaries.
- **B3 Configurable check-in / form governance** (#2, #184, #54–#61, #147–#155):
  org-configurable questionnaire builder; finish migrating page-owned forms onto
  the centralized form system; server/client validation parity.
- **B4 Data confidence + explainability** (#253, #254, #195, #196): confidence
  labels everywhere; an input→rule→output catalog so recommendations are
  transparent; confidence on all recs, not just twin dimensions.
- **B5 Recovery / Fuel / Cognitive recommendation loops** (#239, #240, #263):
  promote the lite entry modules from capture-only to rule-based guidance.
- **B6 Reminders / notifications scheduler** (#257): extend the existing queue to
  fire check-in / habit / reflection nudges (in-app first; push later).
- **B7 Health events** (#10, #11, #12, #13): injury/illness/mental-health
  tracking, return-to-play workflow, growth/maturation, testing library.

GPS ingestion (#350) is also buildable now (pure parser + gated connector,
mirroring the VALD pattern) and can ride in Workstream A's verification.

---

## Workstream C — Externally blocked (stage, don't fake)

Keep failing-closed; build the seams, defer the dependency:
- Vision pose/kinematics ML (#192, #193, #353), frame extraction (#191),
  video upload pipeline + production queue + object storage (#354, #190).
- Local AI / edge cluster (#210, #291).

---

## Workstream D — Large new-product epics (separate roadmaps)

Each is a product in its own right; scope separately rather than folding into the
core app:
- **CogLeague** (#264–#270) — cognitive competition platform.
- **GameFlow** (#271–#281) — football match-flow analytics + media products.
- **Commercial / Ops / IP** (#247–#250, #286–#290) — SaaS packaging, CRM,
  education, licensing, investor ops.

---

## Recommended sequencing

1. **Sprint 1 (now):** W0.1 (Daily Plan fix), W0.2 (AIQ mobile shell), W0.3
   (dummy-content audit) — visible, no deps.
2. **Sprint 2:** B1 (teams/invites/roles) + B2 (reports/export).
3. **Sprint 3:** A (wearables) once creds are provided + GPS ingestion + B4
   (confidence/explainability).
4. **Sprint 4+:** B3 (forms governance), B5, B6, B7.
5. **Parallel/when unblocked:** C (vision). **Separate track:** D (epics).

Each item ships as its own PR per the #81 production standard: tests, i18n audit,
build green, docs, rebase-merge on `web` CI.
