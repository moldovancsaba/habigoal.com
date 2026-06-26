#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO_DIR="/Users/Shared/Projects/Habigoal"
OWNER="moldovancsaba"
PROJECT_NUMBER="14"
ISSUES=(214 50 215 85 49 48 51 216 217)
LABEL="com.habigoal.client-qa-handover-update"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

cd "$REPO_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Starting one-time Client QA handover project update."

if [[ -f "$PLIST" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
  echo "Unloaded and removed one-time LaunchAgent: $PLIST"
fi

if [[ ! -f handover.md ]]; then
  echo "handover.md is missing; aborting."
  exit 1
fi

if ! grep -q "Client QA Delivery Handover - 2026-06-26" handover.md; then
  echo "handover.md does not contain the expected Client QA delivery section; aborting."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is not available; aborting."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is not available; aborting."
  exit 1
fi

rate_json="$(gh api rate_limit)"
graphql_remaining="$(printf '%s' "$rate_json" | jq -r '.resources.graphql.remaining')"
graphql_reset="$(printf '%s' "$rate_json" | jq -r '.resources.graphql.reset')"
echo "GitHub GraphQL remaining: ${graphql_remaining}; reset epoch: ${graphql_reset}"

if [[ "$graphql_remaining" == "0" ]]; then
  echo "GitHub GraphQL is still exhausted; leaving issue comments untouched and exiting for manual follow-up."
  exit 2
fi

project_id="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq '.id')"
fields_json="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
items_json="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 350 --format json)"

dependency_field_id="$(printf '%s' "$fields_json" | jq -r '.fields[] | select(.name=="Client QA Dependencies") | .id')"
status_field_id="$(printf '%s' "$fields_json" | jq -r '.fields[] | select(.name=="Status") | .id')"
review_option_id="$(printf '%s' "$fields_json" | jq -r '.fields[] | select(.name=="Status") | .options[]? | select(.name=="Review (ALMOST)") | .id' | head -n 1)"

if [[ -z "$dependency_field_id" || "$dependency_field_id" == "null" ]]; then
  echo "Client QA Dependencies field was not found; aborting."
  exit 1
fi

item_id_for_issue() {
  local issue_number="$1"
  printf '%s' "$items_json" | jq -r --argjson issue "$issue_number" '.items[] | select(.content.repository=="moldovancsaba/habigoal.com" and .content.number==$issue) | .id' | head -n 1
}

item215="$(item_id_for_issue 215)"
item216="$(item_id_for_issue 216)"

if [[ -n "$item215" && "$item215" != "null" ]]; then
  gh project item-edit --project-id "$project_id" --id "$item215" --field-id "$dependency_field_id" --text "#214, #50"
  echo "Updated #215 Client QA Dependencies."
fi

if [[ -n "$item216" && "$item216" != "null" ]]; then
  gh project item-edit --project-id "$project_id" --id "$item216" --field-id "$dependency_field_id" --text "#214; runtime claims blocked by #50, #215, #49, #48, #51"
  echo "Updated #216 Client QA Dependencies."
fi

if [[ -n "$status_field_id" && "$status_field_id" != "null" && -n "$review_option_id" && "$review_option_id" != "null" ]]; then
  for issue in "${ISSUES[@]}"; do
    item_id="$(item_id_for_issue "$issue")"
    if [[ -z "$item_id" || "$item_id" == "null" ]]; then
      echo "Project item for #${issue} was not found; skipping status update."
      continue
    fi
    gh project item-edit --project-id "$project_id" --id "$item_id" --field-id "$status_field_id" --single-select-option-id "$review_option_id"
    echo "Moved #${issue} to Review (ALMOST)."
  done
else
  echo "Status field or Review (ALMOST) option was not found; dependency cleanup completed without status updates."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Client QA handover project update finished."
