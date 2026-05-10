#!/usr/bin/env bash

set -euo pipefail

OWNER="${1:-moldovancsaba}"
REPO="${2:-habigoal.com}"
CONFIG_PATH="${4:-config/gh-project-board.json}"

TITLE_OVERRIDE="${3:-}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd gh
require_cmd jq

PROJECT_NUMBER=""
TITLE=""

load_config() {
  if [[ ! -f "$CONFIG_PATH" ]]; then
    echo "Missing config file: $CONFIG_PATH" >&2
    exit 1
  fi

  TITLE="$(jq -r '.title' "$CONFIG_PATH")"
  if [[ -n "$TITLE_OVERRIDE" ]]; then
    TITLE="$TITLE_OVERRIDE"
  fi
}

check_rate_limit() {
  local response
  if ! response="$(gh api graphql -f query='query { rateLimit { remaining resetAt } }' 2>/dev/null)"; then
    echo "GitHub GraphQL is currently unavailable for this token." >&2
    echo "Retry after the GitHub rate limit resets." >&2
    exit 1
  fi

  local remaining
  remaining="$(jq -r '.data.rateLimit.remaining // 0' <<<"$response")"
  if [[ "$remaining" == "0" ]]; then
    echo "GitHub GraphQL rate limit is exhausted for the current token." >&2
    echo "Reset at: $(jq -r '.data.rateLimit.resetAt // "unknown"' <<<"$response")" >&2
    exit 1
  fi
}

create_or_reuse_project() {
  local existing
  existing="$(gh project list --owner "$OWNER" --format json | jq -r --arg title "$TITLE" '.projects[] | select(.title == $title) | .number' | head -n1)"

  if [[ -n "${existing:-}" ]]; then
    PROJECT_NUMBER="$existing"
    echo "Reusing existing project #$PROJECT_NUMBER: $TITLE"
    return
  fi

  PROJECT_NUMBER="$(gh project create --owner "$OWNER" --title "$TITLE" --format json --jq '.number')"
  echo "Created project #$PROJECT_NUMBER: $TITLE"
}

ensure_repo_link() {
  gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO" >/dev/null
  echo "Linked $OWNER/$REPO"
}

field_exists() {
  local field_name="$1"
  gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json |
    jq -e --arg name "$field_name" '.fields[] | select(.name == $name)' >/dev/null
}

ensure_single_select_field() {
  local name="$1"
  local options="$2"
  if field_exists "$name"; then
    echo "Field already exists: $name"
    return
  fi
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "$name" \
    --data-type SINGLE_SELECT \
    --single-select-options "$options" >/dev/null
  echo "Created field: $name"
}

ensure_number_field() {
  local name="$1"
  if field_exists "$name"; then
    echo "Field already exists: $name"
    return
  fi
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "$name" \
    --data-type NUMBER >/dev/null
  echo "Created field: $name"
}

ensure_date_field() {
  local name="$1"
  if field_exists "$name"; then
    echo "Field already exists: $name"
    return
  fi
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "$name" \
    --data-type DATE >/dev/null
  echo "Created field: $name"
}

ensure_text_field() {
  local name="$1"
  if field_exists "$name"; then
    echo "Field already exists: $name"
    return
  fi
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "$name" \
    --data-type TEXT >/dev/null
  echo "Created field: $name"
}

draft_exists() {
  local title="$1"
  gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json |
    jq -e --arg title "$title" '.items[] | select(.content.title == $title or .title == $title)' >/dev/null
}

create_draft() {
  local title="$1"
  local body="$2"
  if draft_exists "$title"; then
    echo "Draft already exists: $title"
    return
  fi
  gh project item-create "$PROJECT_NUMBER" --owner "$OWNER" --title "$title" --body "$body" >/dev/null
  echo "Created draft: $title"
}

main() {
  load_config
  check_rate_limit
  create_or_reuse_project
  ensure_repo_link

  while IFS=$'\t' read -r name data_type options; do
    case "$data_type" in
      SINGLE_SELECT)
        ensure_single_select_field "$name" "$options"
        ;;
      NUMBER)
        ensure_number_field "$name"
        ;;
      DATE)
        ensure_date_field "$name"
        ;;
      TEXT)
        ensure_text_field "$name"
        ;;
      *)
        echo "Unsupported field type: $data_type" >&2
        exit 1
        ;;
    esac
  done < <(jq -r '.fields[] | [.name, .dataType, ((.options // []) | join(","))] | @tsv' "$CONFIG_PATH")

  while IFS=$'\t' read -r item_title item_body; do
    create_draft "$item_title" "$item_body"
  done < <(jq -r '.items[] | [.title, .body] | @tsv' "$CONFIG_PATH")

  echo
  echo "Project bootstrap complete."
  echo "Open with: gh project view $PROJECT_NUMBER --owner $OWNER --web"
}

main "$@"
