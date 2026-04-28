# KIDEX

KIDEX is a conductor-facing assessment and reporting app for recording child examination data and generating structured reports.

## Features

- Rapid KRAS and Full KIDEX assessment modes
- Bio-psycho-social weighted scoring with SKI calculation
- Centralized child profiles with longitudinal history
- Child management actions (search, edit, delete with history cleanup)
- New survey from child profile pre-fills only child administration fields (identity context preserved via child UUID)
- Evidence image upload and camera capture support
- Report view with direct PDF download export
- Dashboard analytics (KPI cards + line, pie, and radar charts)
- Localized legal pages (GTC and Privacy Policy)
- Multilingual UI: Hungarian, English, Arabic (RTL)

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

## Local Development

```bash
cp .env.example .env.local
npm install
npm run db:setup
npm run dev
```

## Required Environment Variables

```txt
MONGODB_URI=
MONGODB_DB=kidex
IMGBB_API_KEY=
```

## Data and privacy notes

Assessment images are uploaded through a server-side endpoint (`/api/uploads/imgbb`) and only URL metadata is stored in assessment records.

Role-based API enforcement can be enabled via `KIDEX_ENFORCE_AUTH`; when enabled, protected endpoints validate `x-kidex-role`.
