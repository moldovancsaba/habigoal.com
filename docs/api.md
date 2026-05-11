# Survey API Reference

Base path: Next.js App Router API under `/api/*`.

There is also a standalone local helper server for development:

- Start with `npm run local:server`
- Default URL: `http://localhost:4001`
- It mirrors the documented core read/write endpoints against the same MongoDB database for lightweight local integration testing.

## Authentication model

Role checks are controlled by `SURVEY_ENFORCE_AUTH`.

- When disabled: endpoints work without authentication.
- When enabled: endpoints that require authorization validate the signed-in session roles.
- `x-survey-role` remains available as an override path for trusted integration tests or non-browser callers.

Allowed roles currently used:
- `admin`
- `conductor`
- `observer`

## Endpoints

### Health

- `GET /api/health`
  - Returns service health diagnostics.

### Assessments

- `GET /api/assessments`
  - Returns summary list of assessments.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/assessments`
  - Creates assessment record and syncs centralized child profile.
  - Roles: `admin`, `conductor`.

- `GET /api/assessments/:id`
  - Returns one assessment record.

- `PATCH /api/assessments/:id`
  - Updates one assessment and re-syncs child profile.
  - Automatically appends the current modification timestamp to the `updateHistory` log.

- `DELETE /api/assessments/:id`
  - Deletes one assessment.

### Children

- `GET /api/children`
  - Returns centralized child profiles.
  - If empty, attempts a sync from historical assessments.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/children`
  - Creates/updates child profile by identity (`name` + `birthDate`).
  - Roles: `admin`, `conductor`.

- `GET /api/children/:id`
  - Returns one child profile.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `PATCH /api/children/:id`
  - Updates child profile fields.
  - Also updates linked assessment child identity fields.
  - Roles: `admin`, `conductor`.

- `DELETE /api/children/:id`
  - Deletes child profile and associated assessment history.
  - Includes legacy fallback cleanup by immutable identity (`name` + `birthDate`) for records without `childId`.
  - Roles: `admin`, `conductor`.

- `GET /api/children/:id/history`
  - Returns child profile plus linked chronological assessment history.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

### Users

- `GET /api/users`
  - Returns user list with roles.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/users`
  - Upserts user with role set (`conductor`, `observer`).
  - Roles: `admin`.

### Settings

- `GET /api/settings`
  - Returns settings document:
    - `conductors[]`
    - `observers[]`
    - `locations[]`
    - `company` profile fields (name, ID, legal form, address, VAT, etc.)
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/settings`
  - Saves settings document.
  - Roles: `admin`.

### Uploads

- `POST /api/uploads/imgbb`
  - Uploads image to ImgBB server-side.
  - Returns attachment metadata used in assessments.

## Reporting and export behavior

- **Bio-Psycho-Social Map**: Data-driven PDF generation that aggregates a child's full assessment history to provide longitudinal development trends and expert recommendations.
- **Direct PDF Download**: Export action is client-side (`jsPDF` + `jspdf-autotable`), producing professional, localized documents.
- **Audit Trail**: Every generated report displays the original recording date and the list of update timestamps from the persistent audit log.

## Validation and error response

Validation is centralized in `lib/validations.ts`.

Error format:

```json
{
  "error": "message",
  "code": "VALIDATION_ERROR"
}
```

Common error codes:
- `VALIDATION_ERROR`
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `NOT_FOUND`
- `UNKNOWN_ERROR`
