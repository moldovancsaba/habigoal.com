#!/bin/bash
REPO="moldovancsaba/habigoal.com"
PROJECT_ID=14
OWNER="moldovancsaba"

# Ensure labels exist
LABELS=("type:api" "type:backend" "area:platform" "area:athletes" "priority:next" "source:implementation-6" "type:frontend" "type:ai" "area:ai-research" "gds" "type:data" "type:contracts")

for label in "${LABELS[@]}"; do
  gh label create "$label" --repo $REPO -f >/dev/null 2>&1 || true
done

# Create milestones
create_milestone() {
  local title="$1"
  gh api repos/$REPO/milestones -f title="$title" >/dev/null 2>&1 || true
}

MILESTONES=(
"Athlete IQ 2.0 — Phase 2: Wearable Ecosystem"
"Athlete IQ 2.0 — Phase 5: AI Intelligence Layer"
"Athlete IQ 2.0 — Phase 6: Athlete Vision"
"Athlete IQ 2.0 — Phase 7: Performance Lab"
"Athlete IQ 2.0 — Phase 8: Dashboards, Portal & Communication"
"Athlete IQ 2.0 — Phase 9: Injury Prevention Hub"
"Athlete IQ 2.0 — Phase 10: Integrations & Internationalisation"
)

for m in "${MILESTONES[@]}"; do
  create_milestone "$m"
done

create_issue() {
  local title="$1"
  local milestone="$2"
  local labels="$3"
  local body="$4"
  
  local url=$(gh issue create --repo $REPO --title "$title" --milestone "$milestone" --label "$labels" --body "$body")
  echo "Created: $url - $title"
  
  # Add to project
  gh project item-add $PROJECT_ID --owner $OWNER --url "$url" > /dev/null
}

# ISSUE 1
create_issue "Wearables: Garmin & Whoop Connectors" \
"Athlete IQ 2.0 — Phase 2: Wearable Ecosystem" \
"type:api,type:backend,area:platform,area:athletes,priority:next,source:implementation-6" \
"## Executive Summary
Implement the Garmin and Whoop connectors using the \`WearableConnector\` interface. These will ingest high-level daily recovery, stress, and activity data.

## Goals
- OAuth2 flows for Garmin and Whoop
- Map Whoop recovery and Garmin stress into Canonical Metrics
- Persist raw payloads and sync state

## Architecture
Implement \`WearableConnector\` class for each. Add to nightly cron jobs."

# ISSUE 2
create_issue "Wearables: Apple Health / Google Health Connect" \
"Athlete IQ 2.0 — Phase 2: Wearable Ecosystem" \
"type:api,type:frontend,area:athletes,priority:next,source:implementation-6" \
"## Executive Summary
Implement mobile-friendly API ingestion endpoints for Apple Health and Google Health Connect data pushed from the client app.

## Goals
- Expose a secure endpoint \`/api/athletes/:id/devices/health-sync\`
- Map steps, active calories, and sleep from HealthKit/HealthConnect to Canonical Metrics"

# ISSUE 3
create_issue "AI: Development Engine — longitudinal progression tracking" \
"Athlete IQ 2.0 — Phase 5: AI Intelligence Layer" \
"type:ai,type:backend,area:ai-research,priority:next,source:implementation-6" \
"## Executive Summary
Analyze the 90-day rolling history in the Twin to identify statistical improvements or regressions in physical and technical traits.

## Architecture
- Read 90-day physical/technical Twin history.
- Apply linear regression to identify trend slopes.
- Output \`DevelopmentScore\` and trend badges (improving, stable, declining)."

# ISSUE 4
create_issue "AI: Recommendation Engine — LLM-driven action plans" \
"Athlete IQ 2.0 — Phase 5: AI Intelligence Layer" \
"type:ai,type:backend,area:ai-research,priority:next,source:implementation-6" \
"## Executive Summary
Translate the raw Readiness and Recovery zones into plain-text natural language coaching recommendations using local LLM inference.

## Architecture
- Hook into Local AI cluster worker queue.
- Generate paragraph-length coaching advice from Twin data.
- Enforce strict GDS UI for rendering advice."

# ISSUE 5
create_issue "Vision: Kinematics Analysis Pipeline" \
"Athlete IQ 2.0 — Phase 6: Athlete Vision" \
"type:ai,type:backend,area:ai-research,priority:next,source:implementation-6" \
"## Executive Summary
Expand on the uploaded media pipeline to extract sprint mechanics, joint angles, and symmetry indexes using local pose detection libraries.

## Architecture
- Worker picks up \`uploaded\` video.
- Runs MediaPipe Pose detection.
- Extracts kinematics and updates Technical Twin dimension."

# ISSUE 6
create_issue "Performance: Catapult & STATSports Connectors" \
"Athlete IQ 2.0 — Phase 7: Performance Lab" \
"type:api,type:backend,area:platform,priority:next,source:implementation-6" \
"## Executive Summary
Ingest raw GPS high-speed running and total distance metrics from Catapult and STATSports Open APIs.

## Architecture
- Implement DataConnector for GPS providers.
- Map to \`high_speed_distance_meters\` and \`total_distance_meters\`."

# ISSUE 7
create_issue "Performance: VALD Force Plate & Timing Gate Ingestion" \
"Athlete IQ 2.0 — Phase 7: Performance Lab" \
"type:api,type:backend,area:platform,priority:next,source:implementation-6" \
"## Executive Summary
Ingest peak force, asymmetry, and reaction times directly into the Physical Twin dimension from VALD Hub and Hawkin Dynamics.

## Architecture
- Secure API endpoints for CSV uploads or webhooks.
- Normalise to Canonical Metrics."

# ISSUE 8
create_issue "Dashboards: Athlete Mobile Portal & Twin Visualization" \
"Athlete IQ 2.0 — Phase 8: Dashboards, Portal & Communication" \
"type:frontend,gds,area:athletes,priority:next,source:implementation-6" \
"## Executive Summary
Create a mobile-first GDS view for athletes to see their own AI readiness scores, Twin radar charts, and assigned session plans.

## UX Requirements
- Must use \`@doneisbetter/gds\` exclusively.
- Radar charts for 5-dimension Twin view."

# ISSUE 9
create_issue "Communication: Secure Team Messaging & Alerts" \
"Athlete IQ 2.0 — Phase 8: Dashboards, Portal & Communication" \
"type:frontend,type:backend,area:platform,priority:next,source:implementation-6" \
"## Executive Summary
Implement a basic internal notification and messaging hub for coaches to message athletes directly from readiness alerts.

## Architecture
- \`messages\` and \`notifications\` MongoDB collections.
- Real-time updates via SSE (Server-Sent Events) or polling."

# ISSUE 10
create_issue "Injury Hub: Movement Screening Workflows" \
"Athlete IQ 2.0 — Phase 9: Injury Prevention Hub" \
"type:frontend,type:data,area:athletes,priority:next,source:implementation-6" \
"## Executive Summary
Dedicated forms and analysis for FMS (Functional Movement Screen) tracking, seamlessly integrated with the Injury Risk Engine.

## Requirements
- GDS forms for recording FMS scores.
- Update Physical Twin dimension with results."

# ISSUE 11
create_issue "Platform: External Open API & Webhooks" \
"Athlete IQ 2.0 — Phase 10: Integrations & Internationalisation" \
"type:api,type:contracts,area:platform,priority:next,source:implementation-6" \
"## Executive Summary
Provide API keys and secure endpoints for clubs to export their canonical metrics to external data warehouses (Snowflake, BigQuery).

## Architecture
- API Key generation in Admin Panel.
- Secure, rate-limited public REST API routes under \`/api/v1/...\`.
- Outbound Webhook configuration and dispatch."

