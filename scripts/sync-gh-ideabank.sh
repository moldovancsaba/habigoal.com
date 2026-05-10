#!/usr/bin/env bash

set -euo pipefail

OWNER="${1:-moldovancsaba}"
REPO="${2:-habigoal.com}"
PROJECT_NUMBER="${3:-14}"
MANIFEST="${4:-config/ideabank-issues.json}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd gh
require_cmd jq

REPO_API="repos/$OWNER/$REPO"

ensure_label() {
  local name color description
  name="$(jq -r '.label.name' "$MANIFEST")"
  color="$(jq -r '.label.color' "$MANIFEST")"
  description="$(jq -r '.label.description' "$MANIFEST")"

  gh api "$REPO_API/labels/$name" >/dev/null 2>&1 && return 0

  gh api "$REPO_API/labels" \
    --method POST \
    -f name="$name" \
    -f color="$color" \
    -f description="$description" >/dev/null
}

create_issue_body() {
  local issue_json="$1"
  local objective context goal title scope acceptance
  objective="$(jq -r '.objective' <<<"$issue_json")"
  context="$(jq -r '.context' <<<"$issue_json")"
  goal="$(jq -r '.goal' <<<"$issue_json")"
  title="$(jq -r '.title' <<<"$issue_json")"
  scope="$(jq -r '.scope[] | "- " + .' <<<"$issue_json")"
  acceptance="$(jq -r '.acceptance[] | "- " + .' <<<"$issue_json")"

  cat <<EOF
## Objective

$objective

## Unified Context

$context

## Problem

- Habigoal will remain weaker than category leaders on this workflow without a deliberate implementation.
- Coaches will continue translating raw signals manually instead of receiving structured operational support.
- The product will keep more value in reporting than in decision-making if this capability remains absent.

## Goal

$goal

## Scope
### In Scope

$scope

### Out of Scope

- broad all-in-one club ERP workflows
- speculative enterprise-only complexity before core coach usage is real
- shipping provider-specific integrations beyond the minimal architecture needed unless explicitly required

## Execution Prompt

Implement this as a coach-operating-system capability, not a generic data screen. Prefer fast decisions, clear rationale, and workflow continuity over raw metric density.

## Constraints

- the feature must fit youth-athlete environments, not only pro-team workflows
- privacy and role boundaries must remain explicit
- user-facing output should reduce interpretation load for coaches
- the implementation should preserve room for future integrations rather than hard-coding a single provider assumption

## Acceptance Checks

$acceptance

## Dependencies

- none required to open the workstream; implementation sequencing can be refined later

## Risks

- a shallow implementation may copy category language without delivering decision support
- overfitting to one benchmark platform could distort Habigoal's youth-athlete positioning
- excessive complexity too early could make daily coach usage slower instead of sharper

## Delivery Artifact

A production-ready Habigoal capability for: $title

## Developer Notes

Industry signal came from the 2026-05 benchmark in docs/industry-platform-research-2026-05.md. Preserve Habigoal's differentiation: youth-athlete support, coach clarity, and action-oriented readiness workflows.
EOF
}

ensure_issue() {
  local issue_json="$1"
  local title body issue_number
  title="$(jq -r '.title' <<<"$issue_json")"

  issue_number="$(gh api "$REPO_API/issues" --paginate -q ".[] | select(.title == \"$title\") | .number" | head -n1)"
  if [[ -n "${issue_number:-}" ]]; then
    echo "issue_exists:$issue_number:$title"
    return 0
  fi

  body="$(create_issue_body "$issue_json")"

  gh api "$REPO_API/issues" \
    --method POST \
    -f title="$title" \
    -f body="$body" \
    -f labels[]="$(jq -r '.label.name' "$MANIFEST")" >/dev/null

  echo "issue_created:$title"
}

main() {
  ensure_label

  while IFS= read -r issue_json; do
    ensure_issue "$issue_json"
  done < <(jq -c '.issues[]' "$MANIFEST")

  echo "Issue sync complete."
  echo "Project board sync still requires GitHub Project GraphQL budget for project mutations."
  echo "Target project: https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
}

main "$@"
