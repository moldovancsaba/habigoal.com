# ADR-001: Primary Database — MongoDB Atlas

**Status:** Accepted  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §37 Open Decisions

## Context

The master spec lists MongoDB, PostgreSQL, or hybrid as options for the operational database.

## Decision

Use **MongoDB Atlas** as the sole operational database for Habigoal/Athlete IQ 2.0.

## Rationale

- All repositories, types, and seed/migration scripts target MongoDB.
- Document model fits athlete profiles, twin snapshots, check-in history, and flexible org attributes.
- Vercel deployment already integrated via `lib/mongodb.ts`.

## Consequences

- Warehouse/analytics deferred to export pipelines or future read replica.
- PostgreSQL hybrid rejected unless a specific relational workload emerges (billing, etc.).
