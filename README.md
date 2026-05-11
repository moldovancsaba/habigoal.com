# Habigoal

Habigoal is a mobile-first daily athlete support workspace for coaches and staff. It helps teams capture daily readiness signals from young athletes, surface mental and physical support needs, and turn check-ins into practical follow-up actions.

## Features

- Mobile-first daily athlete check-in flow optimized for one-hand use
- Nine-signal readiness model across physical readiness, mental balance, and sport brain
- Centralized athlete profiles with longitudinal history and support trend views
- Athlete-facing daily operating summary on the athlete detail page with readable state, momentum, and next-action guidance
- Persisted athlete habit tracker with daily routine scoring, streaks, and adherence trend visibility
- Dedicated session planning route at `/dashboard/planning` with a weekly calendar shaped by readiness, support pressure, location scope, and internal load, plus persisted weekly coach plans
- Historical compatibility layer for legacy assessment data and backfilled tracker fields
- Daily readiness reports and PDF export surfaces
- Persistent audit and soft-delete workflows for records and athletes
- Shared multilingual UI with English, Hungarian, Arabic (RTL), Spanish, German, and Hebrew (RTL)
- Localized legal pages for public verification flows
- Design-system driven dashboard, charts, and settings surfaces
- Local API server for lightweight local testing

## Documentation

- [API Reference](docs/api.md)
- [Design System](docs/design-system.md)
- [Deployment](docs/deployment.md)
- [Definition of Done](docs/dod.md)
- [GitHub Project Board Bootstrap](config/gh-project-board.json)
- [Legal and Company Info](docs/legal.md)
- [Product Roadmap](ROADMAP.md)
- [Codex Automation Architecture](.codex/memory/architecture.md)

## GitHub Project Bootstrap

Build the repository project board with:

```bash
./scripts/bootstrap-gh-project-board.sh moldovancsaba habigoal.com
```

The board definition lives in `config/gh-project-board.json`.

## Codex Automation Control Plane

The repository includes a Codex-first automation control plane under `.codex/`.

Structure:

```txt
.codex/
  agents/
  heartbeats/
  memory/
  policies/
```

Design rules:
- GitHub is source control, issue tracking, PR review, and project state.
- Codex is the orchestrator, planner, executor, and documentation maintainer.
- Autonomous loops do not push directly to `main`.
- Continuous automation runs use branch + PR delivery with human merge approval.

The committed heartbeat specs are repository-local operating contracts. The live recurring loop should be registered as a thread-bound Codex heartbeat so audit, planning, implementation, and docs all run in the same dedicated conversation.

## Software Versions

- Next.js: 15.1.4
- React: 19.0.0
- TypeScript: 5.7.3
- MongoDB: 6.12.0
- Node.js: >= 22
- App: 0.5.0

## Local Development

```bash
cp .env.example .env
npm install
npm run db:ping
npm run db:setup
npm run db:seed-demo
npm run dev
```

## Standalone Local API Server

For lightweight local API testing without starting Next.js, run:

```bash
npm run local:server
```

It uses the same `MONGODB_URI`, `MONGODB_DB`, and `SURVEY_ENFORCE_AUTH` environment variables as the main app and exposes a documented subset of the API on `http://localhost:4001` by default. Override the port with `SURVEY_LOCAL_SERVER_PORT`.

## Required Environment Variables

```txt
MONGODB_URI=
MONGODB_DB=survey
MONGODB_APP_NAME=habigoal-local
IMGBB_API_KEY=
```

## MongoDB Atlas Setup

1. Paste your Atlas driver connection string into `.env` as `MONGODB_URI`.
2. Set `MONGODB_DB` to the application database name you created in Atlas.
3. Optionally set `MONGODB_APP_NAME` to distinguish local, preview, and production clients in Atlas metrics.
4. Run `npm run db:ping` to verify the app can reach Atlas before starting Next.js.
5. Run `npm run db:setup` if you want the database indexes and base collections prepared.

The runtime health endpoint `/api/health` now reports whether MongoDB is both configured and reachable.

## Data and privacy notes

Uploaded evidence images are sent through the server-side `imgbb` endpoint and only URL metadata is stored in records.

Role-based API enforcement can be enabled via `SURVEY_ENFORCE_AUTH`; when enabled, protected endpoints validate `x-survey-role`.

## Data lifecycle and traceability

- Athlete and record entities use soft-delete with restore support.
- Historical records can be normalized into the daily tracker schema with `npm run db:backfill-daily-tracker-history`.
- Settings persist standards version metadata for reproducible interpretation of older records.
