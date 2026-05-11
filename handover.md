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
- Deployment is configured for Vercel.

---
*Created by Antigravity AI*
