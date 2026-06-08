#!/bin/bash

REPO="moldovancsaba/habigoal.com"

MILESTONES=(
  "Athlete IQ 2.0 — Phase 2: Wearable Ecosystem"
  "Athlete IQ 2.0 — Phase 3: Digital Twin Foundation"
  "Athlete IQ 2.0 — Phase 4: Local AI Cluster"
  "Athlete IQ 2.0 — Phase 5: AI Intelligence Layer"
  "Athlete IQ 2.0 — Phase 6: Athlete Vision"
  "Athlete IQ 2.0 — Phase 7: Performance Lab"
  "Athlete IQ 2.0 — Phase 8: Dashboards, Portal & Communication"
  "Athlete IQ 2.0 — Phase 9: Injury Prevention Hub"
  "Athlete IQ 2.0 — Phase 10: Integrations & Internationalisation"
)

for m in "${MILESTONES[@]}"; do
  echo "Creating milestone: $m"
  gh api -X POST "repos/$REPO/milestones" -f title="$m" || echo "Milestone may already exist"
done

gh api -X POST "repos/$REPO/labels" -f name='source:implementation-5' -f color='8B5CF6' || true
gh api -X POST "repos/$REPO/labels" -f name='type:queue' -f color='F59E0B' || true
gh api -X POST "repos/$REPO/labels" -f name='area:ai-research' -f color='E2E8F0' || true
gh api -X POST "repos/$REPO/labels" -f name='area:infrastructure' -f color='E2E8F0' || true

