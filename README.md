# Survey

Survey is a mobile-first daily athlete support workspace for coaches and staff. It helps teams capture daily readiness signals from young athletes, surface mental and physical support needs, and turn check-ins into practical follow-up actions.

## Features

- Mobile-first daily athlete check-in flow optimized for one-hand use
- Nine-signal readiness model across physical readiness, mental balance, and sport brain
- Centralized athlete profiles with longitudinal history and support trend views
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
- [Legal and Company Info](docs/legal.md)
- [Product Roadmap](ROADMAP.md)

## Software Versions

- Next.js: 15.1.4
- React: 19.0.0
- TypeScript: 5.7.3
- MongoDB: 6.12.0
- Node.js: >= 22
- App: 0.5.0

## Local Development

```bash
cp .env.example .env.local
npm install
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
IMGBB_API_KEY=
```

## Data and privacy notes

Uploaded evidence images are sent through the server-side `imgbb` endpoint and only URL metadata is stored in records.

Role-based API enforcement can be enabled via `SURVEY_ENFORCE_AUTH`; when enabled, protected endpoints validate `x-survey-role`.

## Data lifecycle and traceability

- Athlete and record entities use soft-delete with restore support.
- Historical records can be normalized into the daily tracker schema with `npm run db:backfill-daily-tracker-history`.
- Settings persist standards version metadata for reproducible interpretation of older records.
