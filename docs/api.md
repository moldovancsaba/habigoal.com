# Habigoal API Reference

Base path: `/api/*`

The API is implemented with Next.js App Router route handlers. Product-facing endpoints use `athletes` and `check-ins`; compatibility endpoints using `children` and `assessments` still exist because the MongoDB collections and older records retain those names.

Use product-language endpoints in new clients:

- prefer `/api/athletes` over `/api/children`
- prefer `/api/check-ins` over `/api/assessments`

Some response payload keys still use compatibility names such as `child`, `childId`, and `assessments`. Treat those as wire-format compatibility fields until the persisted data migration is complete.

## Authentication And Authorization

Auth enforcement is controlled by `HABIGOAL_ENFORCE_AUTH`.

- `false`: development open mode; requests run as the local dev admin/trainer/athlete user.
- `true`: protected routes require a signed SSO session cookie and local user authorization.

Current roles:

- `athlete`
- `trainer`
- `admin`

Legacy role aliases:

- `conductor` maps to `trainer`
- `observer` maps to `athlete`

Access rules:

- Athletes can access only their linked athlete profile, check-ins, habits, and self check-in flow.
- Trainers can access athletes through team membership.
- Admins can access and manage all organization data.

## Error Shape

```json
{
  "error": "message",
  "code": "VALIDATION_ERROR"
}
```

Common codes:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `INVALID_QUERY`
- `INVALID_PAYLOAD`
- `NOT_FOUND`
- `UNKNOWN_ERROR`

## Health

### `GET /api/health`

Returns service diagnostics:

- MongoDB configured/reachable state
- configured database name
- configured MongoDB app name
- ImgBB key presence

## Product Surfaces Registry

### `GET /api/product-surfaces`

Returns the canonical phase-1 surface and function split used by the app landing workflow.

Response:

```json
{
  "version": "phase-1",
  "generatedAt": "2026-06-26T10:00:00.000Z",
  "surfaces": [
    {
      "id": "habigoal",
      "name": "Habigoal",
      "shortName": "Habigoal",
      "headline": "Simple habit tracking and wellbeing support",
      "summary": "A client-facing daily system for living better, training smarter, and receiving clear feedback about current status.",
      "primaryPath": "/habigoal",
      "includedSurfaceIds": [],
      "functionRegistry": []
    },
    {
      "id": "athlete-iq",
      "name": "Athlete IQ",
      "shortName": "AIQ",
      "headline": "Professional performance operating system",
      "summary": "The professional layer for athletes, coaches, academies, dashboards, reports, services, CogLeague, GameFlow, and advanced intelligence.",
      "primaryPath": "/athlete-iq",
      "includedSurfaceIds": ["habigoal"],
      "functionRegistry": []
    }
  ]
}
```

The `functionRegistry` values are intentionally structured for UI, governance, operations, and traceability.

## AthleteIQ Module Maturity Registry

### `GET /api/athleteiq/modules?role=&athleteId=&includeFuture=`

Returns the canonical AthleteIQ module maturity registry filtered by signed-in role and optional athlete access.

Response:

```json
{
  "registryVersion": "aiq-modules-1201.1",
  "capabilityKey": "AIQ-1201",
  "role": "athlete",
  "modules": [
    {
      "key": "readiness",
      "maturity": "active",
      "claimBoundary": "backed_by_user_input",
      "statusLabel": "usable",
      "dataAvailabilityLabel": "live_data",
      "allowedRoles": ["admin", "trainer", "performance_coach", "physio", "analyst", "athlete", "parent"],
      "routes": ["/athletes/[id]", "/dashboard", "/dashboard/athletes/[id]"]
    }
  ],
  "correlationId": "aiq-...",
  "generatedAt": "2026-06-26T10:00:00.000Z",
  "latencyMs": 4
}
```

Future modules are hidden by default. Roadmap or education consumers must explicitly request `includeFuture=true`, and future modules still return `statusLabel: "future_not_actionable"`.

### `GET /api/athleteiq/modules/:key?role=&athleteId=&includeFuture=`

Returns a single permitted module definition. Unknown modules return a structured `404`.

Structured error shape:

```json
{
  "code": "MODULE_NOT_FOUND",
  "messageKey": "athleteiq.errors.MODULE_NOT_FOUND",
  "retryable": false,
  "correlationId": "aiq-..."
}
```

Version, maturity, role filtering, validation, and rollback details are documented in [AthleteIQ Module Maturity Registry](athleteiq-module-registry.md).

## AthleteIQ Adaptive Check-Ins

### `GET /api/athleteiq/check-ins/schema?athleteId=&mode=`

Returns the render-ready field contract for `lifestyle` or `performance` mode. Lifestyle mode includes five required wellness fields plus note. Performance mode includes those fields plus optional motivation, confidence, focus, training load, soreness areas, sleep hours, manual HRV, manual resting heart rate, and device source status.

### `POST /api/athleteiq/check-ins`

Persists or updates the same-day adaptive check-in snapshot for one athlete.

Request:

```json
{
  "athleteId": "athlete-id",
  "mode": "performance",
  "timezone": "Europe/Budapest",
  "values": {
    "sleepQuality": 8,
    "fatigue": 4,
    "pain": 2,
    "stress": 3,
    "mood": 7,
    "confidence": 6,
    "manualHrv": 72,
    "deviceSourceStatus": "manual"
  },
  "idempotencyKey": "athlete-id:2026-06-26:performance"
}
```

The response includes raw values, normalized values for 1-10 fields, missing fields, source labels, `highPain`, and a correlation id. No Daily IQ score is computed here.

### `GET /api/athleteiq/check-ins/today?athleteId=&mode=&timezone=`

Returns the current local-date snapshot for the athlete, mode, and timezone, or `empty: true` when none exists.

Full contract and rollback notes are documented in [AthleteIQ Adaptive Check-In Contract](athleteiq-check-in-contract.md).

## AthleteIQ Daily IQ

### `POST /api/athleteiq/daily-iq/recalculate`

Creates a new immutable Daily IQ recalculation snapshot for one athlete/date/mode.

Request:

```json
{
  "athleteId": "athlete-id",
  "localDate": "2026-06-26",
  "timezone": "Europe/Budapest",
  "mode": "performance"
}
```

The engine reads the adaptive check-in snapshot, habit record, session load, and module registry version. The response includes component scores, final `dailyIqScore`, confidence, data-used labels, missing-data labels, pain guardrail state, algorithm version, and a correlation id. No raw check-in values are returned.

### `GET /api/athleteiq/daily-iq/today?athleteId=&mode=&timezone=`

Returns the latest Daily IQ snapshot for the athlete's current local date, or `empty: true` when no recalculation exists.

### `GET /api/athleteiq/daily-iq/history?athleteId=&from=&to=&mode=&timezone=`

Returns latest snapshots per local date for the requested range.

Daily IQ uses algorithm version `aiq-daily-iq-1220.1`: readiness `0.40`, Mental Edge `0.30`, habit `0.20`, safe load `0.10`. High pain caps the final score at `60` and blocks high-intensity recommendations. Full contract, privacy, rollback, and recovery notes are documented in [AthleteIQ Daily IQ Composite Contract](athleteiq-daily-iq-contract.md).

## AthleteIQ Mental Edge

### `GET /api/athleteiq/mental-edge/today?athleteId=&timezone=&localDate=`

Returns the current Mental Edge score, risk level, trend, supportive routines, missing signals, source labels, and alert candidate for one athlete. Reflection body text is excluded by default.

### `POST /api/athleteiq/mental-edge/routines/:routineId/complete`

Idempotently marks a supportive routine complete for `athleteId + routineId + localDate`.

Request:

```json
{
  "athleteId": "athlete-id",
  "localDate": "2026-06-26",
  "timezone": "Europe/Budapest"
}
```

### `GET /api/athleteiq/coach/mental-alerts?teamId=&timezone=&localDate=`

Returns coach-visible Mental Edge alert candidates for the team. Alerts include reason codes, trend, visible source labels, and recommended coach action. They do not include private reflection content.

Mental Edge uses algorithm version `aiq-mental-edge-1230.1`. Full contract, privacy, rollback, and recovery notes are documented in [AthleteIQ Mental Edge Contract](athleteiq-mental-edge-contract.md).

## AthleteIQ Pain Safety

### `GET /api/athleteiq/pain-guardrail/today?athleteId=&timezone=&localDate=`

Returns the current recovery guardrail for one athlete, including state, risk level, maximum training intensity, Daily IQ cap, required copy key, reason codes, and coach alert id when an alert exists.

### `GET /api/athleteiq/pain-alerts?athleteId=&timezone=&localDate=`

Evaluates the current pain window, upserts an active alert when needed, and returns the athlete's pain alert history.

### `PATCH /api/athleteiq/pain-alerts/:id`

Updates an alert state to `resolved`, `dismissed`, `monitor`, or `coach_review` and appends audit history.

Pain Safety uses algorithm version `aiq-pain-safety-1240.1`. Pain `>= 7` caps Daily IQ at `60` and limits recommendation intensity to recovery. Full contract, rollback, and recovery notes are documented in [AthleteIQ Pain Safety Contract](athleteiq-pain-safety-contract.md).

## AthleteIQ Daily Plan

### `POST /api/athleteiq/daily-plan/generate`

Generates or regenerates the active daily plan for one athlete/date from Daily IQ, Mental Edge, Pain Safety, and habits. Completed task state is preserved when deterministic task ids remain valid.

### `GET /api/athleteiq/daily-plan/today?athleteId=&timezone=&localDate=`

Returns the active daily plan for the athlete's local date, or `empty: true` when none exists.

### `PATCH /api/athleteiq/daily-plan/tasks/:id`

Updates a task completion state to `open`, `completed`, or `dismissed`.

Daily Plan uses version `aiq-daily-plan-1250.1`. Full contract, rollback, and recovery notes are documented in [AthleteIQ Daily Plan Contract](athleteiq-daily-plan-contract.md).

## Auth

### `GET /api/auth/login`

Starts the DoneIsBetter SSO flow. Accepts optional `next` query parameter for return path.

### `GET /api/oauth/callback`

Completes the OAuth callback, validates local user authorization, creates the signed session cookie, updates `lastLoginAt`, and redirects by role.

### `GET /api/auth/me`

Returns the current user session plus local role, primary role, linked athlete id, and team ids.

### `GET /api/auth/logout`

Deletes the local session and redirects to the SSO logout URL when configured.

### `POST /api/auth/logout`

Deletes the local session and returns `{ "success": true }`.

## Onboarding

Onboarding prompts are role-scoped and non-blocking. The route remains usable if onboarding state cannot load.

### `GET /api/onboarding/state`

Returns eligible onboarding modules for the signed-in user and supplied route.

Query parameters:

- `route`: current locale-prefixed or product route, for example `/en/dashboard` or `/en/athletes/ATHLETE_ID`.

Roles: `admin`, `trainer`, `athlete`

Response:

```json
{
  "modules": [
    {
      "id": "athlete-first-login-baseline",
      "role": "athlete",
      "state": "eligible",
      "completedStepIds": []
    }
  ]
}
```

### `POST /api/onboarding/events`

Records an onboarding event idempotently when `idempotencyKey` is supplied.

Roles: `admin`, `trainer`, `athlete`

Request:

```json
{
  "moduleId": "athlete-first-login-baseline",
  "event": "completed",
  "route": "/en/athletes/ATHLETE_ID",
  "stepId": "complete-check-in",
  "idempotencyKey": "athlete-first-login-baseline:completed:complete-check-in:/en/athletes/ATHLETE_ID"
}
```

Supported events are `shown`, `dismissed`, `snoozed`, `completed`, and `failed`.

## Athletes

Product-language aliases:

- `/api/athletes`
- `/api/athletes/:id`
- `/api/athletes/:id/history`
- `/api/athletes/:id/training-load`
- `/api/athletes/:id/restore`

Compatibility aliases:

- `/api/children`
- `/api/children/:id`
- `/api/children/:id/history`
- `/api/children/:id/restore`

### `GET /api/athletes`

Returns athlete profiles.

Query parameters:

- `metrics=true`: include computed metrics.
- `deleted=true`: return soft-deleted athletes. Athletes receive an empty list for this query.

Roles: `admin`, `trainer`, `athlete`

Scope:

- admin: all athletes
- trainer: team athletes
- athlete: linked athlete only

Response: array of athlete profiles. Existing payloads may include compatibility fields such as `surveyId`; new UI should display athlete-facing labels.

### `POST /api/athletes`

Creates or upserts an athlete profile.

Roles: `admin`, `trainer`

### `GET /api/athletes/:id`

Returns one athlete profile.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`.

### `PATCH /api/athletes/:id`

Updates an athlete profile and syncs linked check-in identity fields.

Roles: `admin`, `trainer`

### `PATCH /api/athletes/:id/baseline`

Updates the athlete first-login baseline setup contract and records onboarding completion metadata for the actor.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`; athlete users can update only their linked athlete profile.

Request:

```json
{
  "weeklyGoal": "Build consistent recovery habits",
  "preferredTrainingDays": ["Monday", "Wednesday", "Friday"],
  "supportPreferences": ["Short feedback", "Check-in reminders"]
}
```

At least one baseline field is required. The route updates `baselineProfile.weeklyGoal`, `baselineProfile.preferredTrainingDays`, `baselineProfile.supportPreferences`, and `baselineProfile.onboardingCompletedAt`.

### `DELETE /api/athletes/:id`

Soft-deletes an athlete and associated check-in history.

Roles: `admin`, `trainer`

### `GET /api/athletes/:id/history`

Returns an athlete profile, chronological check-in history, and daily operating metrics derived from the same persisted athlete data.

Roles: `admin`, `trainer`, `athlete`

Response shape:

```json
{
  "child": { "_id": "athlete id", "name": "Athlete Name" },
  "assessments": [],
  "dailyOperatingMetrics": [
    {
      "athleteId": "athlete id",
      "date": "2026-05-25",
      "scoreVersion": "2026-05-25",
      "athleteIqScore": 76,
      "readinessScore": 70,
      "habitScore": 78,
      "recoveryScore": 77.3,
      "trainingLoadPoints": 350,
      "trainingLoadScore": 90,
      "performanceScore": 66.7,
      "readinessZone": "good",
      "sourceCompleteness": {
        "checkIn": true,
        "habits": true,
        "recovery": true,
        "trainingLoad": true,
        "performance": true
      }
    }
  ]
}
```

The `child` and `assessments` keys are compatibility names. Product code should treat them as athlete and check-ins. `dailyOperatingMetrics` is produced by `lib/operating-score.ts`; it does not create local/demo fallback data. Missing sources remain explicit through `sourceCompleteness` and nullable component scores.

### `POST /api/athletes/:id/restore`

Restores a soft-deleted athlete.

Roles: `admin`, `trainer`

## Check-Ins

Product-language aliases:

- `/api/check-ins`
- `/api/check-ins/:id`

Compatibility aliases:

- `/api/assessments`
- `/api/assessments/:id`

### `GET /api/check-ins`

Returns check-in summaries.

Roles: `admin`, `trainer`

Scope follows accessible athlete ids.

Query parameters:

- `deleted=true`: return soft-deleted check-ins. Admin and trainer only.

### `POST /api/check-ins`

Creates a check-in and syncs the athlete profile.

Roles: `admin`, `trainer`, `athlete`

Athlete users can create only for their linked athlete.

Payload includes compatibility fields:

- `childId`: athlete id
- `child`: athlete identity snapshot
- `session`: date, location, context, staff metadata, consent
- `scores`: readiness signal scores
- `trainingLoad`: session type, duration, RPE, optional external load
- `notes`: professional notes

### `GET /api/check-ins/:id`

Returns one check-in.

Roles: `admin`, `trainer`, `athlete`

### `PATCH /api/check-ins/:id`

Updates one check-in and appends to `updateHistory`.

Roles: `admin`, `trainer`

### `DELETE /api/check-ins/:id`

Soft-deletes one check-in.

Roles: `admin`, `trainer`

### `POST /api/check-ins/:id`

Restores one soft-deleted check-in.

Roles: `admin`, `trainer`

Compatibility route note: this restore action is implemented as `POST` on the check-in id route.

## Habits

### `GET /api/athletes/:id/habits`

Returns persisted habit records for an athlete.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`.

Query parameters:

- `from=YYYY-MM-DD`: optional inclusive lower date bound.
- `to=YYYY-MM-DD`: optional inclusive upper date bound.
- `summary=true`: include versioned weighted summaries.

Summary response shape:

```json
{
  "records": [],
  "summaries": [
    {
      "athleteId": "athlete id",
      "date": "2026-05-25",
      "score": 83.3,
      "recoveryScore": 66.7,
      "strongestGapKey": "mobility",
      "scorerVersion": "2026-05-25",
      "categories": [
        { "key": "training", "completed": 2, "total": 2, "weight": 0.4, "contribution": 40 }
      ]
    }
  ]
}
```

Habit summaries are computed from persisted `habit_records` only. Unknown habit keys are ignored by the canonical normalizer rather than becoming an unversioned scoring path.

### `POST /api/athletes/:id/habits`

Creates or updates one dated habit record for an athlete.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`.

## Training Load

### `GET /api/athletes/:id/training-load`

Returns standalone training-load ledger records and a weekly summary for one athlete.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`.

Query parameters:

- `from=YYYY-MM-DD`: optional inclusive lower date bound. Defaults to the selected week start.
- `to=YYYY-MM-DD`: optional inclusive upper date bound. Defaults to the selected week end.
- `weekStart=YYYY-MM-DD`: optional date inside the requested week; normalized to Monday.

Response shape:

```json
{
  "records": [
    {
      "athleteId": "athlete id",
      "date": "2026-05-25",
      "source": "trainer",
      "activityTypes": ["technical"],
      "durationMinutes": 75,
      "rpe": 6,
      "loadPoints": 450,
      "createdBy": "trainer@example.com"
    }
  ],
  "summary": {
    "weekStart": "2026-05-25",
    "totalPoints": 450,
    "zone": "under",
    "records": 1
  }
}
```

Weekly load zones are computed server-side from persisted ledger records: `under` <= 799, `optimal` <= 2200, `heavy` <= 3200, and `risk` above 3200. Empty weeks return `unknown`.

### `POST /api/athletes/:id/training-load`

Creates one standalone training-load ledger record. Load points are computed server-side as `durationMinutes * (rpe ?? 0)`.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`.

Payload:

```json
{
  "date": "2026-05-25",
  "source": "trainer",
  "activityTypes": ["technical", "recovery"],
  "durationMinutes": 75,
  "rpe": 6,
  "note": "Post-session load"
}
```

Validation:

- `date` must be `YYYY-MM-DD`.
- `durationMinutes` must be 1-360.
- `rpe` may be omitted/null or must be 1-10.
- No local/offline/demo fallback records are created.

## Coach Actions

### `GET /api/coach-actions`

Returns coach actions for a date.

Query parameters:

- `date=YYYY-MM-DD`

Roles: `admin`, `trainer`

### `POST /api/coach-actions`

Persists a recommendation action status.

Payload includes:

- `athleteKey`
- `date`
- `recommendationKey`
- `status`: `acknowledged` or `applied`

Roles: `admin`, `trainer`

## Session Plans

### `GET /api/session-plans`

Returns persisted weekly plans.

Query parameters:

- `weekStart=YYYY-MM-DD` required
- `scope=<scope>` optional

If `scope` is omitted, returns all plans for that week. If `scope` is present, returns the matching plan.

Roles: `admin`, `trainer`

### `POST /api/session-plans`

Creates or updates a weekly plan.

Roles: `admin`, `trainer`

## Users

### `GET /api/users`

Returns local authorization users.

Roles: `admin`, `trainer`

Trainer read access exists for current dashboard support, but trainer UI must not expose admin user-management controls.

### `POST /api/users`

Creates or updates a local authorization user.

Roles: `admin`

Rules:

- user email is required
- at least one role is required
- cannot remove own admin access
- cannot remove the final admin
- athlete users should include `athleteId` before they are expected to use the athlete app

### `DELETE /api/users?email=<email>`

Deletes a local authorization user.

Roles: `admin`

Rules:

- cannot delete own access
- cannot delete the final admin

## Teams

### `GET /api/teams`

Returns teams.

Roles: `admin`, `trainer`

Scope:

- admin: all teams
- trainer: teams matching trainer email

### `POST /api/teams`

Creates or updates a team.

Roles: `admin`

Payload includes:

- `_id` optional
- `name`
- `trainerEmails[]`
- `athleteIds[]`

### `DELETE /api/teams?id=<id>`

Deletes a team.

Roles: `admin`

## Settings

### `GET /api/settings`

Returns global settings including company/legal profile, locations, standards metadata, alerting thresholds, and restore/governance support data.

Roles: `admin`, `trainer`

Trainer access is read-only and should not expose admin-only management UI. Admin-only write behavior remains enforced on `POST /api/settings`.

### `POST /api/settings`

Saves global settings.

Roles: `admin`

## Uploads

### `POST /api/uploads/imgbb`

Uploads image evidence through the server-side ImgBB integration.

The browser never receives `IMGBB_API_KEY`.

## Local Helper Server

For lightweight local API testing:

```bash
npm run local:server
```

Default URL: `http://localhost:4001`

It uses the same MongoDB and auth environment variables as the Next.js app and exposes a documented subset of the core API.

## Athlete IQ Extensions (v2)

### `GET /api/openapi`

Returns OpenAPI 3.1 JSON for the Athlete IQ API surface.

### `GET|POST /api/training-sessions`

Training session planner (six categories). POST requires `title`, `date`. Optional `plannedLoadPoints`, `assignedTeamId`, `assignedAthleteIds`.

### `GET|POST /api/microcycles`

Weekly microcycle blocks linked to session IDs.

### `GET /api/concerns?date=YYYY-MM-DD`

Daily check-in concern flags for coach dashboards.

### `POST /api/check-ins/sync`

Batch offline check-in sync. Body: `{ assessments: [...], staffOverride?: boolean }`.

### `GET|POST /api/settings/check-in-config`

Org-configurable check-in questions (admin write).

### `GET /api/reports/team?teamId=`

Aggregated team operating report from digital twins.

### `GET /api/athletes/{id}/media`

List uploaded media and vision analyses for an athlete.

### `POST /api/athletes/{id}/media/upload`

Multipart upload (`file` field). Enqueues vision pipeline.

### `PATCH /api/athletes/{id}/assignment`

Update team, position, status, injury flags, parent email, season history, and custom attributes without overwriting baseline medical fields.

`parent`, `performance_coach`, `physio`, `analyst`, `club_management` — see `lib/permissions.ts` capability matrix.
