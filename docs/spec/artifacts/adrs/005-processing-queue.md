# ADR-005: Processing Queue — MongoDB MVP, Redis at Scale

**Status:** Partial  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §14.7, §37

## Context

Local AI cluster requires job queue with priorities and horizontal workers. Options: RabbitMQ, Kafka, Redis Queue, SQS.

## Decision

**MVP:** MongoDB-backed job collection with admin retry API (`app/api/admin/queue/`).  
**Scale (Phase 4+):** Evaluate Redis Queue or SQS-compatible managed queue.

## Rationale

- Queue types and admin routes already exist in codebase.
- Avoids new infra dependency before local cluster pilot proves volume.

## Consequences

- Nightly batch and vision jobs use same queue abstraction.
- Monitor queue depth per §34.2 operational KPIs.
