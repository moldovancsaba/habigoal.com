# KIDEX API Reference

Base path: Next.js App Router API under `/api/*`.

## Authentication model

Role checks are controlled by `KIDEX_ENFORCE_AUTH`.

- When disabled: endpoints work without role headers.
- When enabled: endpoints that require authorization validate `x-kidex-role`.

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

- `DELETE /api/assessments/:id`
  - Deletes one assessment.

### Children

- `GET /api/children`
  - Returns centralized child profiles.
  - If empty, attempts a sync from historical assessments.

- `POST /api/children`
  - Creates/updates child profile by identity (`name` + `birthDate`).
  - Roles: `admin`, `conductor`.

- `GET /api/children/:id`
  - Returns one child profile.

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

- `POST /api/settings`
  - Saves settings document.
  - Roles: `admin`.

### Uploads

- `POST /api/uploads/imgbb`
  - Uploads image to ImgBB server-side.
  - Returns attachment metadata used in assessments.

## Reporting and export behavior

- Record page provides **direct PDF file generation and download** (client-side `jsPDF` + `jspdf-autotable`).
- Browser print styles remain available for print view tuning, but export action is now download-oriented.

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
