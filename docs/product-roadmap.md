# Habigoal & Athlete IQ — Product Roadmap

_Last updated: 2026-06-28_

Habigoal and Athlete IQ are two surfaces on one platform:

- **Habigoal** — the consumer, white-label wellbeing & habit app for athletes and families.
- **Athlete IQ** — the professional workspace for trainers, coaches and academies.

Both share one data foundation, so a daily check-in entered once powers the athlete's view, the parent summary, and the coach's dashboard.

## How to read this roadmap

| Badge | Meaning |
|---|---|
| 🟢 **Live** | Available now and in everyday use. |
| 🟡 **In progress** | Core is live; we are deepening or completing it. |
| 🔵 **Planned** | Designed and scheduled; build not yet started. |
| ⚪ **Exploratory** | Strategic direction; scope and timing still being shaped. |

Each capability lists its **dependencies** — what must be in place first.

---

## 1. Daily Check-in & Habits 🟢 Live
The everyday heartbeat of the product.

- 🟢 Daily wellbeing check-in (1–10 energy, mood, sleep, soreness)
- 🟢 Daily habits with completion tracking and **streaks** (current / best / active days)
- 🟢 Personal "today" home with status and next action
- 🟢 Microcycle **calendar** planner
- 🟡 Smart **reminders / nudges** (check-in & habits live; session/reflection nudges expanding)
- 🔵 Configurable check-in questionnaires per organisation

_Dependencies: none — this is the foundation other areas build on._

## 2. Readiness & Scoring 🟢 Live
- 🟢 Daily readiness score with plain-language status
- 🟢 Recovery and Fuel "lite" protocols (sleep, soreness, hydration, nutrition)
- 🟢 Score visualisations (gauges, badges, pillars)
- 🟡 Recovery trend interpretation (HRV / strain) — depth in progress
- 🟡 Composite readiness from combined wearable + subjective load (ACWR) — in progress

_Dependencies: Daily Check-in (1); Wearables (6) for sensor-driven depth._

## 3. Coaching & Teams 🟢 Live
- 🟢 Coach workbench with athlete roster, readiness badges and concern flags
- 🟢 Team dashboard with readiness distribution (ready / watch / support)
- 🟢 Team creation, membership and **invitations**
- 🟢 Parent / guardian summary view (privacy-redacted)
- 🟡 Coach↔athlete messaging (live; templated, readiness-triggered nudges in progress)
- 🟡 Task assignment (basic live; full workflows in progress)
- 🔵 Academy management, multi-level club hierarchy, partner CRM

_Dependencies: Athlete Profiles (4), Readiness (2), Identity & Roles (10)._

## 4. Athlete Profiles 🟡 In progress
- 🟢 Athlete profile + baseline capture (anthropometrics, baselines, consent)
- 🟢 Parent/guardian fields and role
- 🟡 Benchmarks & technical/physical profiles — UI in progress
- 🟡 Sports-lab assessment battery (FMS live; broader test library expanding)
- 🔵 Youth growth & maturation tracking
- 🔵 Micro-skill benchmarks & development-priority ranking

_Dependencies: Identity & Roles (10); Privacy (9) for sensitive fields._

## 5. Reports & Exports 🟢 Live
- 🟢 Athlete reports with PDF / CSV / JSON export
- 🟢 Date-range selection and data-source notes
- 🟡 Weekly progress hub & versioned snapshots — aggregation in progress
- 🟡 Team-level report depth (sub-team / position breakdowns) — in progress
- 🔵 Clear "AI-assisted vs. rule-based" labelling on all commentary (safety item)

_Dependencies: Readiness (2), Coaching & Teams (3)._

## 6. Wearables & Integrations 🟡 In progress
- 🟢 Manual wearable sync with status & last-sync time
- 🟢 Consumer wearable normalisers (Whoop, Garmin, Oura, Polar)
- 🔵 Professional GPS ingestion (Catapult / StatSports) — connectors being replaced with real parsing
- 🔵 Testing-tool (VALD etc.) ingestion adapters
- ⚪ Smart capture stations / hardware

_Dependencies: Digital Twin (7) consumes these signals._

## 7. Digital Twin 🟡 In progress
A unified 5-dimension model (physical, performance, technical, recovery, cognitive).

- 🟢 Twin model + dashboard with confidence and synced sources
- 🟡 Twin updates from wearables — live; remaining sources being wired
- 🔵 **Vision AI** (pose / kinematics / technique) — pipeline scaffolding present; real video processing & models planned
- 🔵 Video frame-extraction pipeline & object storage

_Dependencies: Wearables (6); Vision AI depends on the Local-AI compute layer (14) and the frame-extraction pipeline._

## 8. AI & Intelligence 🟡 In progress
- 🟢 Readiness, recovery, injury-risk and recommendation engines
- 🟢 Versioned model registry with documented inputs/outputs/limitations
- 🟡 Confidence shown consistently across all recommendation surfaces
- 🟡 Advisory-pattern enforcement (rule-based labelling, **mandatory human review for minors**) — safety item, in progress
- 🔵 Predictive development forecasting
- 🔵 AI-coach nudges & narrative guidance
- ⚪ Football analytics (GameFlow) and CogLeague cognitive league

_Dependencies: Daily Check-in (1), Readiness (2), Digital Twin (7); safety gating before any AI surface ships._

## 9. Privacy, Consent & Compliance 🟡 In progress
- 🟢 Role-based permissions & field-level access control
- 🟢 Audit-event trail (exports, erasures, role changes)
- 🟢 Data export (GDPR)
- 🟡 Data erasure workflow — in progress
- 🟡 Cookie consent with documented inventory & category gating — in progress
- 🟡 Guardian consent & age-based access rules — in progress

_Dependencies: Identity & Roles (10)._

## 10. Identity & White-label 🟡 In progress
- 🟢 Email-first sign-in with persistent session
- 🟢 Role model (athlete, parent, trainer, coach, physio, analyst, admin, club management)
- 🟡 **Standalone Habigoal registration** (decouple from Athlete IQ) — in progress
- 🟡 Production OIDC / SSO — prepared; provider hardening in progress

_Dependencies: Privacy (9). White-label decouple builds on the shared profile contract (Live)._

## 11. Mobile & Tablet Experience 🟡 In progress
- 🟢 Consumer mobile shell with thumb-zone bottom navigation & safe-area handling
- 🟢 Virtual-keyboard safety (no input-zoom, keep field visible, pinch-zoom preserved)
- 🟡 Design-token & accessibility consistency pass — in progress
- 🔵 Adaptive component family (dialogs↔sheets, menus↔drawers, tables↔cards)
- 🔵 Tablet navigation rail / split-view & professional desktop app shell

_Dependencies: the adaptive component family unblocks the tablet rail, desktop shell, and the full AIQ surface migration._

## 12. Design System (GDS) 🟡 In progress
- 🟢 Core surfaces migrated to the shared design system
- 🟡 Token consistency (radii, colour, spacing) — migration in progress
- 🔵 GDS public shell, admin data views, and form-field contracts
- 🔵 Retire remaining local styling authority

_Dependencies: Mobile/Tablet (11) shares the same primitives._

## 13. Platform & Data Foundation 🟢 Live
- 🟢 Centralized form registry, schema compiler and renderer
- 🟢 Shared athlete profile & canonical-metric contract
- 🟢 Training history / development log
- 🟡 Privacy-safe telemetry instrumentation — in progress
- 🔵 Background job queue **workers** (scheduler/execution) for async processing
- 🔵 Demo ecosystem seeding (sample trainers/athletes with history) for evaluation & demos

_Dependencies: underpins every other area._

## 14. Compute & Enterprise (Exploratory) ⚪
Strategic direction, scope and timing still being shaped:

- ⚪ Local AI cluster / edge deployment (powers Vision AI & forecasting)
- ⚪ Football analytics platform (GameFlow) & broadcaster products
- ⚪ Coach education & methodology licensing
- ⚪ Operations, finance, partner CRM, investor reporting

_Dependencies: builds on the AI (8), Digital Twin (7) and Platform (13) foundations._

---

## Dependency map (high level)

```
Daily Check-in (1) ─┬─► Readiness & Scoring (2) ─┬─► Reports (5)
                    │                            └─► Digital Twin (7) ─► AI & Intelligence (8) ─► Compute & Enterprise (14)
Identity & Roles(10)─┼─► Privacy & Consent (9)
                    ├─► Athlete Profiles (4) ─► Coaching & Teams (3)
Wearables (6) ──────┘
Platform & Data (13) ──► (foundation for all)
Design System (12) ──► Mobile/Tablet (11) ──► Adaptive components ──► Tablet rail / Desktop shell / AIQ migration
```

## Status summary

| Area | Status |
|---|---|
| Daily Check-in & Habits | 🟢 Live |
| Readiness & Scoring | 🟢 Live (deepening) |
| Coaching & Teams | 🟢 Live (advanced features planned) |
| Athlete Profiles | 🟡 In progress |
| Reports & Exports | 🟢 Live (depth in progress) |
| Wearables & Integrations | 🟡 In progress |
| Digital Twin | 🟡 In progress |
| AI & Intelligence | 🟡 In progress |
| Privacy, Consent & Compliance | 🟡 In progress |
| Identity & White-label | 🟡 In progress |
| Mobile & Tablet Experience | 🟡 In progress |
| Design System | 🟡 In progress |
| Platform & Data Foundation | 🟢 Live |
| Compute & Enterprise | ⚪ Exploratory |

_This roadmap reflects the platform as built today; statuses are reviewed as features ship._
