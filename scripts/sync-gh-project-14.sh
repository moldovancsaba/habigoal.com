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

DEFAULT_FIELDS_JSON='["Title","Assignees","Status","Labels","Linked pull requests","Milestone","Repository","Reviewers","Parent issue","Sub-issues progress"]'

PROJECT_JSON="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
PROJECT_ID="$(jq -r '.id' <<<"$PROJECT_JSON")"
FIELDS_JSON="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
ITEMS_JSON="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json)"

delete_non_default_fields() {
  jq -c --argjson defaults "$DEFAULT_FIELDS_JSON" '
    .fields[]
    | select(([$defaults[]] | index(.name)) | not)
    | {id, name}
  ' <<<"$FIELDS_JSON" | while IFS= read -r field; do
    field_id="$(jq -r '.id' <<<"$field")"
    field_name="$(jq -r '.name' <<<"$field")"
    gh project field-delete --id "$field_id" >/dev/null
    echo "field_deleted:$field_name"
  done
}

ensure_issue_on_project() {
  local issue_number="$1"
  local issue_url="https://github.com/$OWNER/$REPO/issues/$issue_number"
  local exists
  exists="$(jq -r --arg url "$issue_url" '.items[] | select(.content.url == $url) | .id' <<<"$ITEMS_JSON" | head -n1)"
  if [[ -n "${exists:-}" ]]; then
    echo "project_item_exists:$issue_number"
    return
  fi

  gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$issue_url" >/dev/null
  echo "project_item_added:$issue_number"
}

set_status_todo() {
  local status_field_id todo_option_id
  status_field_id="$(jq -r '.fields[] | select(.name == "Status") | .id' <<<"$FIELDS_JSON")"
  todo_option_id="$(jq -r '.fields[] | select(.name == "Status") | .options[] | select(.name == "Todo") | .id' <<<"$FIELDS_JSON")"

  ITEMS_JSON="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json)"

  while IFS= read -r issue_number; do
    item_id="$(jq -r --arg url "https://github.com/$OWNER/$REPO/issues/$issue_number" '.items[] | select(.content.url == $url) | .id' <<<"$ITEMS_JSON" | head -n1)"
    if [[ -z "${item_id:-}" ]]; then
      continue
    fi
    gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$status_field_id" --single-select-option-id "$todo_option_id" >/dev/null
    echo "status_todo:$issue_number"
  done < <(gh api "repos/$OWNER/$REPO/issues?state=open&per_page=100" --paginate | jq -r '.[] | select(.title | startswith("Habigoal:")) | .number')
}

main() {
  delete_non_default_fields

  while IFS= read -r title; do
    issue_number="$(gh api "repos/$OWNER/$REPO/issues?state=all&per_page=100" --paginate | jq -r --arg title "$title" '.[] | select(.title == $title) | .number' | head -n1)"
    if [[ -n "${issue_number:-}" ]]; then
      ensure_issue_on_project "$issue_number"
    fi
  done < <(jq -r '.issues[].title' "$MANIFEST")

  set_status_todo
}

main "$@"
