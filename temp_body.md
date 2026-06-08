## Executive Summary

Implement the Injury Risk Indicator Engine — the AI module that identifies concerning load, recovery, and movement patterns and surfaces them as sport performance risk signals for coach review. This is not a medical diagnostic tool; it is a coaching decision-support layer that flags when an athlete may benefit from reduced load, additional recovery, or professional review. All outputs are explicitly non-medical and human-review-gated.

## Business / Product Context

Avoidable soft-tissue injuries and overreaching are the most expensive operational risk in youth sport programmes. Clubs and academies that can identify athletes approaching overload earlier can intervene before absence begins. The injury risk indicator is a key commercial differentiator — parents, clubs, and federations value it highly. However, the system must never claim to predict or prevent injury with certainty, and must not produce outputs that could be interpreted as clinical diagnosis.

## Current State

- Training load zones exist (`lib/training-load.ts`): under/optimal/heavy/risk
- ACWR computed in Digital Twin (Issue 2)
- No multi-signal risk aggregation exists
- No risk alert type specific to injury signals (general `acwr_risk` alert from Issue 9 is a step, but not sufficient)
- No professional review escalation exists

## Problem Statement

No structured injury risk indicator exists. Coaches have load zone information but no aggregated risk picture that combines load, recovery, movement, and history signals. Without a structured signal, the platform cannot fulfil the Injury Prevention Hub module of Athlete IQ 2.0.

## Goals

### Functional Goals
- Compute `InjuryRiskOutput` per athlete per date from Twin dimensions
- Risk factors: ACWR, HRV deviation, consecutive soreness, sleep deficit, load spike, movement asymmetry (when Phase 6 available)
- Risk level: `none` / `monitor` / `review_recommended` / `urgent_review`
- `urgent_review` → generate alert + require human review flag before training recommendation issued
- All outputs explicitly labelled as performance risk indicators, not medical diagnoses

### Technical Goals
- Engine versioned (`injury-risk-1.0.0`)
- Outputs stored in `ai_outputs` with `type: 'injury_risk'`
- Idempotent upsert per athleteId+date+engineVersion
- Medical language guardrails enforced in output generation

### UX Goals
- Risk badge on athlete tile (command center + athlete detail)
- Risk detail: per-factor breakdown with source citation
- `review_recommended` / `urgent_review`: GDS warning/critical banner + "Refer to medical staff" CTA
- Coach must acknowledge risk before issuing training load above `reduced_intensity`

## Non-Goals
- Medical diagnosis or clinical risk stratification
- Return-to-play clinical protocol (out of scope for this release)
- Automatic training plan modification
- Any output language suggesting diagnosis, treatment, or clinical prediction

## Mandatory Technical Constraints

All UI must use `@doneisbetter/gds`. Risk badges, banners, and CTAs use GDS tokens — warning amber and critical red per GDS token definitions. No custom risk colours. Medical boundary language enforced: use "risk indicator", "recommend review", "movement observation" — never "injury", "diagnosis", "prevent injury", "treats".

## Architecture

```text
Readiness Engine completes → queue: injury_risk job
  → InjuryRiskEngine.compute(twin, date) → InjuryRiskOutput
  → If riskLevel = 'urgent_review': generate injury_risk Alert (critical severity)
  → Persist to ai_outputs
  → Coach dashboard: risk badge on athlete tile
  → Athlete detail: risk indicator section

Coach reviews urgent_review athlete:
  → "Refer to medical staff" CTA (GDS SemanticButton)
  → POST /api/coach-actions { type: 'injury_risk_review', status: 'applied' }
  → Risk acknowledged; training recommendation gated until acknowledged
```

## Data Model / Contracts

```ts
// types/ai-output.ts (extend)

export type InjuryRiskLevel = 'none' | 'monitor' | 'review_recommended' | 'urgent_review';

export interface InjuryRiskFactor {
  key: string;
  label: string;              // i18n key — must use approved performance language
  riskContribution: 'low' | 'moderate' | 'high';
  value?: number;
  threshold?: number;
  dataRecency: 'today' | 'recent' | 'stale' | 'missing';
  requiresHumanReview: boolean;
}

export interface InjuryRiskOutput {
  outputId: string;
  athleteId: string;
  date: string;
  engineVersion: string;      // 'injury-risk-1.0.0'
  riskLevel: InjuryRiskLevel;
  confidence: 'high' | 'medium' | 'low';
  factors: InjuryRiskFactor[];
  humanReviewRequired: boolean;
  humanReviewReason?: string;
  suggestedLoadReduction?: number;   // percentage, e.g. 30
  // EXPLICITLY non-medical language:
  disclaimerKey: 'injury_risk.performance_indicator_disclaimer';
  computedAt: string;
}
```

## Algorithm / Processing Logic

**Injury Risk Engine v1.0.0 — rule-based aggregation (no ML in Phase 9)**:

```text
Factor thresholds:
  ACWR > 1.5:              riskContribution = 'high',   requiresHumanReview = true
  ACWR 1.3–1.5:            riskContribution = 'moderate'
  HRV < baseline - 1.5 SD: riskContribution = 'high',   requiresHumanReview = true
  HRV < baseline - 1.0 SD: riskContribution = 'moderate'
  consecutive soreness ≥ 4 days (score ≥ 7): riskContribution = 'high'
  sleep deficit 3d (avg < 6hr): riskContribution = 'moderate'
  load spike (today > 7d avg × 1.5): riskContribution = 'moderate'

riskScore = Σ riskContribution weights:
  high = 3, moderate = 2, low = 1
  
riskLevel:
  score = 0: 'none'
  score 1–2: 'monitor'
  score 3–5: 'review_recommended'
  score ≥ 6 OR any requiresHumanReview=true factor: 'urgent_review'

humanReviewRequired = riskLevel in ['review_recommended', 'urgent_review']
```

```ts
// lib/engines/injury-risk.engine.ts

const ENGINE_VERSION = 'injury-risk-1.0.0';
const DISCLAIMER_KEY = 'injury_risk.performance_indicator_disclaimer' as const;

function compute(twin: AthleteTwin, date: string): InjuryRiskOutput {
  const factors: InjuryRiskFactor[] = [];
  let totalRisk = 0;
  let humanReviewRequired = false;

  // ACWR
  if (twin.performance.acwr != null) {
    if (twin.performance.acwr > 1.5) {
      factors.push({ key: 'acwr', label: 'training_load.acwr_risk',
        riskContribution: 'high', value: twin.performance.acwr, threshold: 1.5,
        dataRecency: 'recent', requiresHumanReview: true });
      totalRisk += 3;
      humanReviewRequired = true;
    } else if (twin.performance.acwr > 1.3) {
      factors.push({ key: 'acwr', label: 'training_load.acwr_elevated',
        riskContribution: 'moderate', value: twin.performance.acwr,
        dataRecency: 'recent', requiresHumanReview: false });
      totalRisk += 2;
    }
  }

  // ... HRV, soreness, sleep deficit

  return {
    outputId: buildOutputId(twin.athleteId, date, ENGINE_VERSION),
    athleteId: twin.athleteId, date,
    engineVersion: ENGINE_VERSION,
    riskLevel: totalRiskToLevel(totalRisk, humanReviewRequired),
    confidence: deriveConfidence(twin),
    factors: factors.sort((a, b) => RISK_WEIGHT[b.riskContribution] - RISK_WEIGHT[a.riskContribution]),
    humanReviewRequired,
    humanReviewReason: humanReviewRequired
      ? 'One or more performance risk indicators recommend professional review.'
      : undefined,
    disclaimerKey: DISCLAIMER_KEY,
    computedAt: new Date().toISOString(),
  };
}
```

## UX / Operator Behaviour

**Command center athlete tile risk badge**:
- `none`: no badge
- `monitor`: GDS info badge "Monitor"
- `review_recommended`: GDS warning badge "Review recommended"
- `urgent_review`: GDS critical badge "Urgent review" + pulsing indicator

**Athlete detail — risk indicator section**:
- GDS `SectionCard` "Performance Risk Indicators"
- Factor list: icon + label + source citation + value
- Disclaimer text rendered from `disclaimerKey` i18n entry: "These are coaching performance indicators, not medical diagnoses. Consult qualified health professionals for medical assessment."
- `review_recommended`/`urgent_review`: GDS warning banner + "Refer to medical staff" button
- After coach acknowledges: banner replaced by "Reviewed on [date] by [trainer]"

**Loading**: GDS skeleton
**None risk**: no section shown (or collapsed "No risk indicators today")

## Accessibility Requirements

- Risk badges never communicate severity by colour alone (badge text required)
- Disclaimer text must not be hidden or collapsed by default for `urgent_review`
- "Refer to medical staff" button has descriptive `aria-label`
- Risk factor list keyboard-navigable

## Edge Cases

- **No Twin data**: `riskLevel = 'none'`, `confidence = 'low'`, no factors displayed — do not show false reassurance
- **HRV missing (no wearable)**: HRV factor omitted; noted in "Missing data" section
- **Athlete has injury_history flag** (Phase 3+ feature): elevate `review_recommended` → `urgent_review`
- **Coach doesn't acknowledge urgent_review**: training recommendation API returns reduced_intensity regardless; coach override requires explicit acknowledgement

## Performance Expectations

- Risk computation: <30ms per athlete (rule-based, no ML inference)
- Batch 100 athletes: <10s

## Security / Privacy Requirements

- Risk outputs are personal health-adjacent data; RBAC enforced
- Athlete sees own risk only
- No risk output language can contain medical diagnosis terms — enforce in CI lint rule

## Acceptance Criteria

### Functional
- [ ] `InjuryRiskOutput` computed for all 4 risk levels from test fixtures
- [ ] `urgent_review` generates `injury_risk` critical alert
- [ ] `disclaimerKey` present on every output
- [ ] Training recommendation gated on acknowledgement for `urgent_review`

### Technical
- [ ] `ENGINE_VERSION = 'injury-risk-1.0.0'` in every output
- [ ] Fixture tests cover ACWR > 1.5, HRV deviation, consecutive soreness
- [ ] Medical language guardrail: CI check that output strings do not contain forbidden terms

### UX
- [ ] Risk badge on command center tile (GDS only)
- [ ] Disclaimer visible for review_recommended/urgent_review
- [ ] "Refer to medical staff" CTA present for urgent_review

### Accessibility
- [ ] Risk badges have `aria-label`
- [ ] Disclaimer not hidden for urgent_review

### Documentation
- [ ] Medical boundary language documented in `docs/architecture.md`
- [ ] Forbidden output terms list added to `docs/dod.md`

## Handover

### What Changed
- `lib/engines/injury-risk.engine.ts`
- `types/ai-output.ts` — InjuryRiskOutput
- `GET /api/athletes/:id/injury-risk?date=...`
- `messages/*.json` — `injury_risk.*` keys including disclaimer
- Command center + athlete detail risk badge components

### Rollback Plan
- Remove injury risk section from athlete detail and command center
- `ai_outputs` (type: injury_risk) additive; no existing data affected