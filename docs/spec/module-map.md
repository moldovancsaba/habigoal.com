# Athlete IQ 2.0 — Module Map

Generated: 2026-06-08  
Source: `AthleteIQ_2_Master_Documentation_Package.docx` v3.0

Maps document sections to implementation modules, delivery phases, and Habigoal code areas.

| Module | Name | Doc sections | Phase | Key Habigoal paths | Gap summary |
|--------|------|--------------|-------|-------------------|-------------|
| **M1** | Athlete OS Core | §9, §38.1–38.2, Phase 1 | 1 | `components/forms/AthleteCheckInApp.tsx`, `repositories/child.repository.ts`, `app/[locale]/dashboard/coach/page.tsx` | Mostly shipped; gaps: configurable check-in, parent role, athlete status |
| **M2** | Training & Load | §38.3, Phase 1 | 1 | `repositories/session-plans.repository.ts`, `lib/training-load.ts`, `app/api/session-plans/` | Session plans + RPE done; microcycle and planned-vs-actual load partial |
| **M3** | Wearable Ecosystem | §12.3, §38.4, Phase 2 | 2 | `services/connectors/`, `lib/wearable-ingestion.ts`, `types/canonical-metric.ts` | Garmin/Whoop connected; Polar/Apple Health UI only; normalisation partial |
| **M4** | Digital Twin | §10, §40, Phase 3 | 3 | `types/athlete-twin.ts`, `lib/twin-updater.ts`, `repositories/athlete-twin.repository.ts` | 5-dimension schema done; not all sources wired to updater |
| **M5** | Local AI Cluster | §14, Phase 4 | 4 | `types/queue.ts`, `app/api/admin/queue/`, `services/ai-clustering.service.ts` | Queue stub; no Mac mini cluster deployment |
| **M6** | AI Intelligence | §16, §38.6, §41, Phase 5 | 5 | `lib/engines/*.ts`, `lib/engines/recommendation.engine.ts` | 5 engines exist; explainability, override audit, model registry missing |
| **M7** | Athlete Vision | §17, §38.5, Phase 6 | 6 | `services/vision-ai.service.ts`, `services/media/kinematics.service.ts` | Event stub only; no production vision pipeline |
| **M8** | Performance Lab | §18, Phase 7 | 7 | `services/connectors/gps.connector.ts` | GPS connector early; BlazePod/FITLIGHT/force plates not started |
| **M9** | Dashboards & Portal | §19–20, §38.7, Phase 8 | 8 | `app/[locale]/dashboard/`, `components/dashboard/MainDashboard.tsx` | Coach/athlete dashboards partial; dedicated mobile PWA incomplete |
| **M10** | Injury Prevention | §20, Phase 9 | 9 | `lib/engines/injury-risk.engine.ts`, `app/dashboard/injury-hub/fms/page.tsx` | Risk engine + FMS page early; full hub not built |
| **M11** | Comms & Collab | §21, Phase 8 | 8 | `app/api/teams/[teamId]/messages/route.ts` | Team messaging partial; scheduling/video comms missing |
| **M12** | Integrations & API | §22, §25, Phase 10 | 10 | `app/api/`, `docs/api.md` | REST routes exist; no OpenAPI spec |
| **M13** | Compliance & Security | §26–30, §42–43, Phase 0/11 | 0, 11 | `repositories/consent.repository.ts`, `app/[locale]/legal/` | Consent + legal pages partial; audit log, export/deletion, AI governance gaps |
| **M14** | Ops & QA | §44–46, Phase 11 | 11 | `docs/dod.md`, `tests/` | Release gates defined in spec; operational monitoring incomplete |

## Phase alignment (remapped for Habigoal)

| Phase | Spec name | Habigoal status | Next work |
|-------|-----------|-----------------|-----------|
| 0 | Discovery & compliance blueprint | **In progress** | ADRs done; DPIA starter pending |
| 1 | Athlete OS Foundation | **~80% done** | CHK-002, ATH-005/006, ROL-001 parent role |
| 2 | Wearable Ecosystem | **~50% done** | WER-003/004, Polar/Apple Health connectors |
| 3 | Digital Twin Foundation | **~60% done** | DTW-002 full source wiring, multi-season history |
| 4 | Local AI Cluster | **Not started** | QUE-001 production queue + worker MVP |
| 5 | AI Intelligence Layer | **~40% done** | REC-001–004, ENG-001 factors, AI-002 registry |
| 6–11 | Vision, Lab, Hub, etc. | **Future** | See module briefs |

## Requirement coverage by module

| Module | Must reqs | Done | Partial | Missing |
|--------|-----------|------|---------|---------|
| M1 | 12 | 4 | 6 | 2 |
| M2 | 4 | 2 | 2 | 0 |
| M3 | 5 | 2 | 3 | 0 |
| M4 | 2 | 1 | 1 | 0 |
| M6 | 9 | 0 | 7 | 2 |
| M7 | 7 | 0 | 3 | 4 |
| M9 | 6 | 2 | 3 | 1 |
| M13 | 6 | 0 | 5 | 1 |
| M12 | 1 | 0 | 0 | 1 |

(Full row-level detail in `gap-matrix.csv`.)

## Cross-module dependencies

```
M1 (check-in) ──► M4 (twin) ◄── M3 (wearables)
                      │
                      ▼
                 M6 (AI engines) ──► M9 (dashboards)
                      │
                      ▼
                 M5 (queue) ◄── M7 (vision) ◄── ADR-006 (storage)
```

## Related artifacts

- Requirements: `artifacts/requirements.json`
- Gap matrix: `gap-matrix.csv`
- Traceability: `artifacts/traceability.json`
- ADRs: `artifacts/adrs/`
- Backlog candidates: `artifacts/backlog-import.json`
