# Athlete IQ 2.0 — Spec Consumption Package

Canonical breakdown of `AthleteIQ_2_Master_Documentation_Package.docx` (v3.0, 2026-06-07) for Habigoal implementation planning.

**Generated:** 2026-06-08

## Quick start

1. Read **`module-map.md`** for phase/module overview and gap summary.
2. Use **`gap-matrix.csv`** for row-level requirement status vs Habigoal.
3. Import backlog from **`artifacts/backlog-import.json`** (39 Must/partial issues ready for GitHub Project 14).
4. Resolve architecture questions via **`artifacts/adrs/`** (8 ADRs).
5. Full spec text in **`athlete-iq-2-master-v3.md`** (searchable, do not edit by hand — regenerate from DOCX).

## Directory layout

```
docs/spec/
├── README.md                          ← this file
├── athlete-iq-2-master-v3.md          ← normalized full spec (~80 KB)
├── section-registry.json              ← 241 sections with content types
├── content-type-map.json              ← machine-readable section index
├── module-map.md                      ← 14 modules × phases × gaps
├── gap-matrix.csv                     ← 58 requirements × status × code paths
├── modules/
│   └── README.md                      ← one-page brief per module (M1–M14)
└── artifacts/
    ├── requirements.json              ← 58 REQ IDs (§38 + derived)
    ├── nfr.json                       ← 22 non-functional requirements
    ├── acceptance-criteria.json       ← Phases 0–11 deliverables + AC
    ├── data-contracts.json            ← 15 entities + sample JSON objects
    ├── open-decisions.json            ← raw §37 options
    ├── open-decisions-resolved.json   ← Habigoal resolutions + ADR links
    ├── traceability.json              ← req → module → phase → code → issue
    ├── backlog-import.json            ← 39 GitHub issue templates
    └── adrs/
        ├── 001-primary-database.md
        ├── 002-identity-provider.md
        ├── 003-data-warehouse.md
        ├── 004-local-ai-runtime.md
        ├── 005-processing-queue.md
        ├── 006-object-storage.md      ← OPEN — needs decision
        ├── 007-pilot-scope.md
        └── 008-hardware-ownership.md
```

## Gap summary (58 requirements)

| Status | Count | Meaning |
|--------|-------|---------|
| Done | 10 | Meets spec intent in Habigoal main |
| Partial | 34 | Exists but missing acceptance criteria |
| Missing | 14 | Not implemented |

**Priority focus:** 39 open Must/partial items in `backlog-import.json`.

## Delivery phase remap

The spec defines Phases 0–11. Habigoal reality:

| Phase | Status |
|-------|--------|
| 0 Discovery | ADRs complete; DPIA starter pending |
| 1 Athlete OS | ~80% — close configurable check-in, parent role |
| 2 Wearables | ~50% — normalisation + sync status |
| 3 Digital Twin | ~60% — wire all sources to twin updater |
| 4–11 | Planned — see module briefs |

## Traceability

Every requirement follows:

```
REQ ID → module (M1–M14) → phase → gap status → code path → GitHub issue
```

Example: `WER-003` → M3 → Phase 2 → partial → `types/canonical-metric.ts` → #78

## Regenerating from DOCX

When the source document updates:

1. Place new DOCX at a known path.
2. Re-run the extraction script (see git history for 2026-06-08 Python extractor).
3. Re-run gap assessment against `main`.
4. Bump version in `section-registry.json`.

## Related Habigoal docs

- `docs/project-brief-2026-06-07.md` — current product brief
- `docs/athlete-iq-gap-analysis-2026-05-25.md` — prior gap import (issues #78–#90)
- `ROADMAP.md` — active engineering themes

## Consumption checklist

- [x] DOCX normalized to markdown
- [x] Section registry (241 sections)
- [x] Requirements extracted (58 IDs)
- [x] NFR extracted (22 items)
- [x] Data contracts (15 entities)
- [x] Phase acceptance criteria (12 phases)
- [x] Open decisions resolved (8 ADRs)
- [x] Gap matrix vs Habigoal
- [x] Module map + briefs (14 modules)
- [x] Backlog import templates (39 issues)
- [x] GitHub issues imported to Project 14 (#182–#211 created; #65, #78, #81, #83, #84 linked)
- [ ] DPIA starter pack (legal workstream)
- [ ] OpenAPI spec generation (M12)
