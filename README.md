# Survey

Survey is a conductor-facing assessment and reporting app for recording child examination data and generating structured reports.

## Features

- Rapid KRAS and Full Survey assessment modes
- Bio-psycho-social weighted scoring with SKI calculation
- Centralized child profiles with longitudinal history
- **Professional Reporting**: Data-driven PDF exports with longitudinal "Bio-Psycho-Social Maps" and development trend analysis
- **Chart Outcome Sentences**: Existing KPI and chart surfaces include localized, data-driven explanation sentences
- **Persistent Audit Log**: Full modification history for assessments, including soft-delete and restore events
- **Unified Updates**: Ability to re-open and update any existing assessment record directly in survey mode
- Child management actions (search, edit, delete with history cleanup)
- New survey from child profile pre-fills only child administration fields (identity context preserved via child UUID)
- Evidence image upload and camera capture support
- Report view with direct PDF download export
- Dashboard analytics (KPI cards + line, pie, and radar charts)
- Standards governance in Settings:
  - standards version manager
  - clone active version
  - publish lock for versions
  - impact preview before activation
- Restore workflows:
  - restore bin in Settings for children and assessments
  - inline "Show Deleted" + typed restore confirmation on Children and Records pages
- Localized legal pages (GTC and Privacy Policy) - Publicly accessible for Google Verification
- Multilingual UI: Hungarian, English, Arabic (RTL)
- **Internal Deep Linking**: Unified navigation between children profiles, assessment records, and trend charts

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
npm run dev
```

## Required Environment Variables

```txt
MONGODB_URI=
MONGODB_DB=survey
IMGBB_API_KEY=
```

## Data and privacy notes

Assessment images are uploaded through a server-side endpoint (`/api/uploads/imgbb`) and only URL metadata is stored in assessment records.

Role-based API enforcement can be enabled via `SURVEY_ENFORCE_AUTH`; when enabled, protected endpoints validate `x-survey-role`.

## Data lifecycle and traceability

- Assessments and children use soft-delete with restore support.
- Assessment records persist `standardsVersionUsed` for reproducible historical interpretation.
- Settings store versioned standards with active version selection.
