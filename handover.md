# Project Handover - Survey Professionalization

This document summarizes the state of the project after the first major enhancement phase and provides technical details for the next steps.

## Technical Stack & Versions

- **Framework**: [Next.js 15.1.4](https://nextjs.org/) (App Router)
- **Library**: [React 19.0.0](https://react.dev/)
- **Language**: [TypeScript 5.7.3](https://www.typescriptlang.org/)
- **Internationalization**: [next-intl](https://next-intl-docs.vercel.app/)
- **Database**: [MongoDB 6.12.0](https://www.mongodb.com/)
- **Runtime**: Node.js >= 22

## Accomplishments

### 1. Internationalization (i18n)
- Integrated `next-intl` with full support for **Hungarian** (default) and **English**.
- Implemented localized routing (`/hu/`, `/en/`).
- Centralized messages in `/messages`.

### 2. Dashboard Architecture
- Transitioned from a single-page app to a multi-page dashboard.
- Dedicated routes for `/assessment`, `/records`, and `/settings`.
- Shared sidebar and header in `/app/[locale]/dashboard/layout.tsx`.

### 3. Logic & UX Enhancements
- **Auto-Age Grouping**: Logic in `lib/utils/age.ts` automatically assigns age groups (4-6, 7-9, 10-12) based on the birthdate.
- **Predictive Search**: `SearchableSelect` component implemented for Conductor and Observer fields.
- **Service Layer**: Initial `user-service.ts` created for future RBAC integration.

### 4. Internal Linking & Legal Compliance (v0.4.0)
- **Internal Linking**: Deep linking between Children, Records, and trend charts.
- **Legal Compliance**: Publicly accessible `/legal` routes for Google Verification.

### 5. Athlete Daily Operating Layer (v0.5.x)
- Athlete detail pages now start with a player-readable daily operating summary.
- The athlete surface translates the latest check-in into an operating score, readiness mode, momentum, focus area, and clear next actions.
- Athlete history now sorts chronologically before deriving latest-state summaries and time-window trends.

### 6. Habit Adherence Layer (v0.5.x)
- Athlete detail pages now include a persisted daily habit tracker.
- Habit records are stored separately in `habit_records` and exposed through `GET/POST /api/athletes/:id/habits`.
- The athlete surface now shows habit score, completion count, streak, category focus, and a short adherence trend alongside the daily operating view.

### 7. Session Planning Layer (v0.5.x)
- Coaches now have a dedicated `/dashboard/planning` route for weekly session planning.
- The planning page translates current readiness, support pressure, missing check-ins, and internal load into a week-shaped calendar.
- Location filtering is built in so planning can be scoped to the full group or a specific active site.
- Weekly plans can now be persisted through `GET/POST /api/session-plans` and stored in the `session_plans` collection.
- Athlete detail pages now reflect the current saved weekly plan when a matching scope or athlete-specific plan exists.

### 8. Release Notes Surface (v0.5.x)
- A public `/news` surface now exists for weekly release notes and “What’s New” updates.
- News posts are backed by structured content in `content/news/posts.json`, which makes automation-safe weekly publishing straightforward.

### 9. Public Athlete App and SSO Re-enable Prep (v0.5.x)
- A public athlete app now exists at `/[locale]/athletes` with a live athlete directory and athlete-facing entrypoint behavior.
- The public athlete detail route reuses the data-rich athlete page but now suppresses coach-only controls such as delete, PDF export, and planning actions.
- DoneIsBetter SSO has been prepared for re-enable through environment-driven auth enforcement, request-aware callback redirects, and session-cookie based API authorization.
- Production SSO setup instructions now live in `docs/sso-setup.md`.

### 10. User Rights Hardening (v0.5.x)
- User access management is now effectively admin-owned rather than conductor-owned.
- `POST /api/users` now requires an admin session and rejects zero-role users.
- `DELETE /api/users` now blocks self-removal and removal of the last remaining admin.
- Successful SSO logins update `lastLoginAt` in the `users` collection, which feeds admin visibility in Settings.
- The Settings > User Rights screen now shows approved-user counts, access state, last login, search, and UI guards around protected admin accounts.

### 11. Entity Model and Team Access (v0.5.x)
- The old `conductor / observer / admin` access shape has been replaced in the application layer by `trainer / athlete / admin`.
- Legacy stored roles still normalize safely on read so old accounts continue working during migration.
- Athlete accounts can now be linked to a single athlete profile and are scoped to their own athlete data in the athlete app, athlete history, habits, and check-in creation.
- Trainer accounts are now the primary coach-facing entity and are scoped through team membership rather than broad observer-style access.
- A first-pass `teams` collection and `/api/teams` endpoint now exist so admins can create teams and attach trainers plus athletes from Settings.

### 12. Route-Level Permission Gating (v0.5.x)
- Dashboard shell routing now enforces the access model in the UI layer as well as the API layer.
- Athlete users are redirected away from coach-admin dashboard routes and kept inside athlete-facing surfaces, while still being allowed into the check-in flow.
- Trainer users are redirected away from `/dashboard/settings`, which remains an admin-only route.
- The dashboard navigation chrome is suppressed on blocked routes so role leakage does not happen through stale sidebar state.
- The athlete app entry route at `/[locale]/athletes` now redirects signed-in athletes to their own profile and sends trainer/admin users back to dashboard athlete management, so it does not remain a shared selector surface under authenticated use.

### 13. Onboarding Foundation (v0.5.x)
- A modular onboarding architecture now exists in `docs/onboarding-architecture.md`.
- Typed onboarding definitions, state records, and engine helpers now exist in `types/onboarding.ts` and `lib/onboarding/*`.
- A dedicated `onboarding_state` persistence surface now exists for per-user onboarding progress.
- `GET/POST /api/onboarding/state` and `POST /api/onboarding/events` are in place as the first API layer for future role-aware onboarding delivery.
- A reusable onboarding checklist card and provider now exist as the first UI primitives for future athlete, trainer, admin, and release-note onboarding flows.
- Athlete onboarding is now active in the product: the athlete profile and athlete check-in flow can render the first-login intro, first-check-in checklist, and habit tracker checklist, with onboarding completion updated from real check-in and habit-save events.
- Trainer onboarding is now active in the product: the coach dashboard, athlete roster/detail flow, and weekly planning surface can render trainer-first onboarding modules, with completion updated from real athlete-detail opens and weekly plan saves.

## Next Steps (Roadmap Focus)

### 1. Legal Page Availability
- Ensure the Privacy Policy and GTC on `https://survey.messmass.com/legal` remain publicly accessible.

### 2. Offline Capability (PWA)

### 3. Codex Automation Runtime
- The repository now carries a Codex-first control plane in `.codex/`.
- Agent roles are separated into `audit`, `planner`, `implementer`, and `docs`.
- Repository memory lives in `.codex/memory/` and must be kept aligned with GitHub Project state.
- Autonomous work is branch-and-PR only; direct pushes to `main` are disallowed for unattended loops.
- Continuous recurring loops are intended to run every 3 hours via a dedicated Codex heartbeat conversation, not GitHub Actions orchestration.

## Deployment Notes
- Ensure `MONGODB_URI`, `MONGODB_DB`, and `IMGBB_API_KEY` are set in the production environment.
- For SSO-enabled production, also set `APP_URL`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_BASE_URL`, `SSO_REDIRECT_URI`, `AUTH_SECRET`, and `SURVEY_ENFORCE_AUTH`.
- Deployment is configured for Vercel.

---
*Created by Antigravity AI*
