# ADR-007: First Pilot Scope — Digital Twin + Wearables

**Status:** Accepted  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §37, §31 Phases 2–3

## Context

Open decision: wearables first, vision first, or digital twin first.

## Decision

Parallel track: **harden Digital Twin (Phase 3)** while **completing wearable normalisation (Phase 2)**.

Vision (Phase 6) and Performance Lab (Phase 7) deferred until object storage and local AI cluster are ready.

## Rationale

- Twin schema and updater already exist — highest leverage for coach dashboards.
- Wearables reduce manual check-in burden and feed recovery/physical dimensions.
- Vision requires ADR-006 (storage) and ADR-004 (ML runtime).

## Sequencing

1. Close WER-003/004 gaps (canonical metrics, sync status).
2. Wire twin-updater to all ingestion paths (DTW-002).
3. Then object storage → vision pipeline.
