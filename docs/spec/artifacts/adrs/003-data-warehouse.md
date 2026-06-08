# ADR-003: Data Warehouse — Deferred

**Status:** Deferred  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §12.4, §37

## Context

Spec describes a data warehouse for multi-season analytics. Options: Snowflake, BigQuery, PostgreSQL replica, DuckDB/Parquet.

## Decision

**Defer warehouse** through Phase 3. Use MongoDB aggregations, versioned report snapshots, and CSV/JSON export for analytics.

## Rationale

- Current scale (academy/club pilots) does not require separate warehouse.
- NFR-SCA-005 (multi-season analytics) can be met via twin history + export until federation scale.

## Revisit Trigger

- 10+ organisations or federation-level reporting (Phase 10).
- Query latency on operational DB exceeds SLO.
