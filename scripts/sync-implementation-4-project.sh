#!/usr/bin/env bash

set -euo pipefail

OWNER="${1:-moldovancsaba}"
REPO="${2:-habigoal.com}"
MANIFEST_PATH="${3:-config/implementation-4-artifacts.json}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd gh
require_cmd jq

FIELD_ORDER="Execution Order"
FIELD_DEPENDS="Depends On"
FIELD_PACK="Pack"

ensure_project_fields() {
  for field in "$FIELD_ORDER" "$FIELD_DEPENDS" "$FIELD_PACK"; do
    if ! gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
      | jq -e --arg name "$field" '.fields[] | select(.name == $name)' >/dev/null; then
      case "$field" in
        "$FIELD_ORDER")
          gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "$field" --data-type NUMBER >/dev/null
          ;;
        *)
          gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "$field" --data-type TEXT >/dev/null
          ;;
      esac
    fi
  done
}

ensure_status_todo() {
  local status_field_id todo_option_id
  status_field_id="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
    | jq -r '.fields[] | select(.name == "Status") | .id')"
  todo_option_id="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
    | jq -r '.fields[] | select(.name == "Status") | .options[] | select(.name == "Todo") | .id')"
  [ -n "$status_field_id" ] && [ -n "$todo_option_id" ] && \
    gh project item-edit --id "$1" --project-id "$PROJECT_ID" --field-id "$status_field_id" --single-select-option-id "$todo_option_id" >/dev/null
}

set_field_text() {
  local item_id="$1"
  local field_name="$2"
  local value="$3"
  local field_id
  field_id="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json | jq -r --arg name "$field_name" '.fields[] | select(.name == $name) | .id')"
  [ -z "$field_id" ] && return 0
  gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$field_id" --text "$value" >/dev/null
}

set_field_number() {
  local item_id="$1"
  local field_name="$2"
  local value="$3"
  local field_id
  field_id="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json | jq -r --arg name "$field_name" '.fields[] | select(.name == $name) | .id')"
  [ -z "$field_id" ] && return 0
  gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$field_id" --number "$value" >/dev/null
}

item_id_for_issue() {
  local issue_url="$1"
  local item_id
  item_id="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json \
    | jq -r --arg url "$issue_url" '.items[] | select(.content.url == $url) | .id' | head -n1)"
  echo "$item_id"
}

ensure_issue_on_project() {
  local issue_number="$1"
  local issue_url="https://github.com/$OWNER/$REPO/issues/$issue_number"
  local existing_item_id
  existing_item_id="$(item_id_for_issue "$issue_url")"
  if [ -n "$existing_item_id" ]; then
    echo "project_item_exists:$issue_number"
    echo "$existing_item_id"
    return
  fi
  gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$issue_url" >/dev/null
  sleep 1
  item_id_for_issue "$issue_url"
}

main() {
  local pack_title project_number
  pack_title="$(jq -r '.pack' "$MANIFEST_PATH")"
  project_number="$(jq -r '.projectNumber' "$MANIFEST_PATH")"
  PROJECT_NUMBER="${project_number:-14}"

  PROJECT_ID="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json | jq -r '.id')"

  gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json >/dev/null
  ensure_project_fields

  while IFS= read -r issue_json; do
    issue_number="$(jq -r '.number' <<<"$issue_json")"
    exec_order="$(jq -r '.executionOrder' <<<"$issue_json")"
    deps="$(jq -r '[.dependencies[] | tostring] | join(", ")' <<<"$issue_json")"
    item_id="$(ensure_issue_on_project "$issue_number")"
    [ -n "$item_id" ] || continue

    if [ -n "$item_id" ] && [ -n "$exec_order" ] && [ "$exec_order" != "null" ]; then
      set_field_number "$item_id" "$FIELD_ORDER" "$exec_order"
    fi
    set_field_text "$item_id" "$FIELD_DEPENDS" "$deps"
    set_field_text "$item_id" "$FIELD_PACK" "$pack_title"
    ensure_status_todo "$item_id"
  done < <(jq -c '.sequencing[]' "$MANIFEST_PATH")

  echo "Implementation-4 board sync complete."
}

main "$@"
