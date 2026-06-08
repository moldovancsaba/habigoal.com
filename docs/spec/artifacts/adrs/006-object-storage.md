# ADR-006: Object Storage — Replace imgbb

**Status:** Open  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §12.3, §38.5 VIS-002

## Context

Spec requires S3-compatible object storage for photos/videos with metadata in DB. Current implementation uses imgbb (`app/api/uploads/imgbb/route.ts`).

## Decision

**Pending.** Recommended: **Cloudflare R2** or **Vercel Blob** for cloud deployment; **MinIO** for on-prem local AI cluster sites.

## Rationale

- imgbb does not support video pipeline, signed URLs, or retention policies required by §40.
- R2/Blob align with Vercel hosting; MinIO aligns with privacy-first local deployments.

## Action Items

1. Define `MediaAsset` repository aligned with §24 entity model.
2. Migrate upload API to presigned URL pattern.
3. Wire vision jobs to object storage paths (VIS-003).
