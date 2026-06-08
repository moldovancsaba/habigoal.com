# ADR-008: Hardware Ownership — Deferred to Phase 4

**Status:** Deferred  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §32.3, §37

## Context

Commercial model offers customer-owned, HaaS, or hybrid Mac mini cluster hardware.

## Decision

**Defer** hardware procurement decisions until Phase 4 Local AI Cluster pilot customer is identified.

## Rationale

- Phases 1–3 run entirely on Vercel + MongoDB Atlas.
- No local inference required for current TS scoring engines.

## Default Assumption

Customer-owned hardware with Athlete IQ software deployment (per spec §36 assumptions).
