# Release Policy

Autonomous loops do not release directly to production.

Release expectations:
- implementation loops prepare pull requests
- documentation loops prepare supporting documentation updates
- CI and human review gate merge and release

Minimum validation before proposing release-ready work:
- `npm run lint`
- `npm run test`
- `npm run build`

Release notes should mention:
- user-facing behavior changes
- data model changes
- environment or deployment changes
- known risks or follow-up items
