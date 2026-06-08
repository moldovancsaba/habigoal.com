# ADR-004: Local AI Runtime — Hybrid TS + Future ML

**Status:** Partial  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §14, §16, §41

## Context

Spec favours local inference for privacy. Runtime options: Ollama, llama.cpp, MLX, PyTorch, ONNX Runtime.

## Decision

**Phase 1–3:** Deterministic scoring engines in TypeScript (`lib/engines/*`).  
**Phase 4–6:** ONNX Runtime or MLX on Mac mini worker nodes for vision/pose models.

## Rationale

- Readiness, recovery, injury-risk, and recommendation engines are rule/statistical — no LLM required.
- Vision pipeline (VIS-004–007) requires ML runtime not yet deployed.

## Consequences

- AI-002 (model registry) applies when ML models ship.
- Local cluster (QUE-001) blocked on hardware + runtime choice for vision only.
