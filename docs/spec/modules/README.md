# Module Briefs — Athlete IQ 2.0

One-page summaries per implementation module. Full requirements in `../artifacts/requirements.json`.

---

## M1 — Athlete OS Core (Phase 1)

**Purpose:** Daily operating loop — profiles, check-ins, teams, coach visibility.

**Spec sections:** §9 User Roles, §38.1–38.2, Phase 1 acceptance criteria.

**Habigoal today:** Check-in app, athlete CRUD, coach dashboard, teams, roles (athlete/trainer/admin).

**Gaps (Must):** CHK-002 configurable questions, ATH-005 parent/guardian, ROL-001 extended roles.

**Next epics:**
1. Org-configurable check-in field registry
2. Parent/guardian user type + consent workflow
3. Athlete status lifecycle (active/injured/archived)

---

## M2 — Training & Load (Phase 1)

**Purpose:** Session planning, RPE, training load ledger, planned vs actual.

**Spec sections:** §38.3, §16.3 Development Engine.

**Habigoal today:** Session plans API, RPE route, `lib/training-load.ts`.

**Gaps:** TRN-005 planned vs completed load, TRN-006 microcycle planning.

**Next epics:** Issue #80 training load ledger, #83 session blueprints + debrief.

---

## M3 — Wearable Ecosystem (Phase 2)

**Purpose:** Connect Oura/Whoop/Garmin/Polar/Apple Health; normalise to canonical metrics.

**Spec sections:** §12.3, §38.4, Phase 2 acceptance criteria.

**Habigoal today:** Garmin + Whoop connectors, OAuth callback, consent, wearables UI.

**Gaps:** WER-003 full canonical schema, WER-004 sync status, Polar/Apple Health/Fitbit connectors.

**Next epics:** Issue #78 operating metrics contract; complete normalisers + sync UI.

---

## M4 — Digital Twin (Phase 3)

**Purpose:** 5-dimension athlete model updated from all sources.

**Spec sections:** §10, §24, §40.3, Phase 3 acceptance criteria.

**Habigoal today:** `AthleteTwin` type with physical/performance/technical/recovery/cognitive, twin updater, API route.

**Gaps:** DTW-002 — wire check-in, wearables, engines, and vision into updater.

**Next epics:** Source-linked twin refresh pipeline; multi-season history beyond 90-day cap.

---

## M5 — Local AI Cluster (Phase 4)

**Purpose:** Privacy-first batch processing on horizontal worker nodes.

**Spec sections:** §14, Phase 4 acceptance criteria.

**Habigoal today:** Queue types, admin retry API, ai-clustering service stub.

**Gaps:** QUE-001 production queue, worker deployment, monitoring (§34.2).

**Next epics:** MongoDB queue hardening → Redis/SQS evaluation; worker MVP on single node.

---

## M6 — AI Intelligence (Phase 5)

**Purpose:** Readiness, recovery, development, technique, injury risk, recommendation engines.

**Spec sections:** §16, §38.6, §41.

**Habigoal today:** 5 TS engines in `lib/engines/`; coach actions for recommendations.

**Gaps:** REC-001–004 explainability + override audit; ENG-001 factors; AI-002 model registry; technique engine missing.

**Next epics:** Issues #81, #84; add `technique.engine.ts`; recommendation reason/confidence UI.

---

## M7 — Athlete Vision (Phase 6)

**Purpose:** Photo/video upload, pose analysis, movement quality observations.

**Spec sections:** §17, §38.5, Phase 6 acceptance criteria.

**Habigoal today:** Vision AI event stub, kinematics service, vision dashboard page.

**Gaps:** VIS-001–007 — blocked on ADR-006 object storage; no frame extraction or quality gates.

**Next epics:** Object storage migration → media job queue → pose pipeline MVP (sprint analysis first).

---

## M8 — Performance Lab (Phase 7)

**Purpose:** GPS, timing gates, BlazePod, FITLIGHT, force plates integration.

**Spec sections:** §18, Phase 7 acceptance criteria.

**Habigoal today:** GPS connector early stub.

**Gaps:** All device integrations except partial GPS.

**Next epics:** Catapult/GPS normaliser; BlazePod reaction data connector pattern.

---

## M9 — Dashboards & Portal (Phase 8)

**Purpose:** Overview, athlete, team, training, analytics dashboards; mobile PWA.

**Spec sections:** §19, §38.7, §21, Phase 8 acceptance criteria.

**Habigoal today:** Coach dashboard, digital twin page, reports, athlete app home.

**Gaps:** RPT-002 team reports, RPT-006 AI marking, dedicated mobile PWA, offline mode (CHK-006).

**Next epics:** Report source notes; AI commentary labels; athlete-only shell completion.

---

## M10 — Injury Prevention Hub (Phase 9)

**Purpose:** Risk assessment, load monitoring, movement screening, recovery monitoring.

**Spec sections:** §20 Injury Prevention Hub, Phase 9.

**Habigoal today:** Injury risk engine, FMS page stub.

**Gaps:** Full hub workflows, movement screening integration with vision, prevention strategies.

**Next epics:** Persistent risk alerts (#84); FMS → twin technical dimension feed.

---

## M11 — Comms & Collab (Phase 8)

**Purpose:** Team messaging, scheduling, reporting share, video comms, RBAC.

**Spec sections:** §21.

**Habigoal today:** Team messages API.

**Gaps:** Scheduling, video comms, role-based message visibility.

**Next epics:** Extend team messaging; link to session plans for scheduling.

---

## M12 — Integrations & API (Phase 10)

**Purpose:** Open API, connector framework, federation-scale integrations.

**Spec sections:** §22, §25, Phase 10.

**Habigoal today:** REST API routes, markdown API docs.

**Gaps:** API-001 OpenAPI spec; public API versioning; webhook standardisation.

**Next epics:** Generate OpenAPI from route handlers; external API key auth for federation.

---

## M13 — Compliance & Security (Phase 0/11)

**Purpose:** GDPR, youth protection, AI governance, audit, medical language boundary.

**Spec sections:** §26–30, §42–43.

**Habigoal today:** Consent repository, legal pages, consent modal, guardian fields in schema.

**Gaps:** SEC-002 audit log, PRV-001 export/deletion, REC-006 minor review, AI-002 model docs.

**Next epics:** Audit event repository; data export API; copy governance checklist from §30.1.

---

## M14 — Ops & QA (Phase 11)

**Purpose:** Testing gates, monitoring KPIs, release criteria, onboarding runbook.

**Spec sections:** §34, §44–46, Phase 11.

**Habigoal today:** `docs/dod.md`, vitest tests, i18n audit gate.

**Gaps:** Operational KPIs (§34.3): check-in >80%, wearable sync >95%, nightly batch window.

**Next epics:** Monitoring dashboard; release gate checklist from §44.2; pilot onboarding playbook.
