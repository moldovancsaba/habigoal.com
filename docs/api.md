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

## Athletes

Product-language aliases:

- `/api/athletes`
- `/api/athletes/:id`
- `/api/athletes/:id/history`
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

### `DELETE /api/athletes/:id`

Soft-deletes an athlete and associated check-in history.

Roles: `admin`, `trainer`

### `GET /api/athletes/:id/history`

Returns an athlete profile and chronological check-in history.

Roles: `admin`, `trainer`, `athlete`

Response shape:

```json
{
  "child": { "_id": "athlete id", "name": "Athlete Name" },
  "assessments": []
}
```

The `child` and `assessments` keys are compatibility names. Product code should treat them as athlete and check-ins.

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

### `POST /api/athletes/:id/habits`

Creates or updates one dated habit record for an athlete.

Roles: `admin`, `trainer`, `athlete`

Scope: checked with `canAccessAthlete`.

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
