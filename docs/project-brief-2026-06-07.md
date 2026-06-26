# Habigoal Project Brief

Date: 2026-06-07
Repository: `moldovancsaba/habigoal.com`
Project board: `https://github.com/users/moldovancsaba/projects/14`

## Executive Summary

Habigoal is a role-aware athlete operating system for athletes, trainers, and admins. The product turns daily readiness, habit, training-load, and planning data into operational decisions: athletes know what to do today, trainers know who needs attention, and admins can govern users, teams, settings, legal information, and access.

The current product has moved beyond a simple check-in app. It now includes athlete profiles, longitudinal readiness and habit history, training-load records, coach action tracking, weekly planning, reports, team scoping, public news/legal pages, DoneIsBetter SSO preparation, and multilingual support.

The strategic direction is to harden the core operating loop before expanding the platform:

1. collect daily athlete signals
2. convert signals into readiness, habit, load, and risk context
3. guide trainers toward source-linked actions
4. reflect plans and summaries back to athletes
5. preserve governance, reporting, access control, and internationalization quality

## Business Value

Habigoal creates value by shortening the distance between athlete status and staff action.

- Athletes get a self-scoped daily workspace for check-ins, habits, readiness trends, weekly context, and support actions.
- Trainers get a command center for priority athletes, missed check-ins, readiness buckets, recommendations, session blueprints, weekly planning, and coach action traceability.
- Admins get operational control over users, teams, settings, restore workflows, company/legal data, and governance.
- Clubs and academies get a repeatable operating model for youth-athlete support, with future room for onboarding, reports, telemetry, health events, return-to-play, integrations, and stakeholder summaries.

The strongest product spine is:

1. coach command center
2. athlete trend interpretation
3. athlete daily operating dashboard
4. habit adherence and routine scoring
5. training load and session planning
6. weekly operating summaries and reports

## Product Surface

Public routes:

- `/{locale}`
- `/{locale}/news`
- `/{locale}/news/[slug]`
- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`

Athlete routes:

- `/{locale}/athletes`
- `/{locale}/athletes/[id]`
- `/{locale}/athletes/[id]/check-in`

Trainer/admin routes:

- `/{locale}/dashboard`
- `/{locale}/dashboard/assessment`
- `/{locale}/dashboard/athletes`
- `/{locale}/dashboard/athletes/[id]`
- `/{locale}/dashboard/records`
- `/{locale}/dashboard/records/[id]`
- `/{locale}/dashboard/planning`
- `/{locale}/dashboard/settings`

## Technical Architecture

Stack:

- Next.js App Router
- React 19
- TypeScript
- MongoDB Atlas
- `next-intl`
- Mantine through governed `@doneisbetter/gds`
- DoneIsBetter SSO plus local authorization
- Vercel deployment target
- Node.js 22.x

Primary directories:

- `app/[locale]`: localized public, athlete, dashboard, planning, settings, news, and legal routes
- `app/api`: product APIs and compatibility aliases
- `components`: dashboard, athlete app, form, analytics, layout, UI, theme, and news components
- `repositories`: MongoDB persistence layer
- `services`: application service logic
- `lib`: access, sessions, scoring, validation, habit, training-load, readiness, report, and utility contracts
- `messages`: locale catalogs for `en`, `hu`, `es`, `de`, `ar`, and `he`
- `content/news`: localized public news content
- `docs`: project, architecture, deployment, design, user, and governance documentation
- `.codex`: Codex automation control plane, memory, agents, policies, and heartbeat specs

Important data collections:

- `children`: athlete profiles, retained as compatibility storage
- `assessments`: check-ins, retained as compatibility storage
- `habit_records`: habit adherence records
- `training_load_records`: standalone training-load ledger records
- `coach_actions`: trainer action state and traceability
- `session_plans`: weekly planning records
- `teams`: team membership and trainer/athlete scoping
- `users`: local authorization records linked to SSO identity
- `settings`: global settings, legal/company data, alerting, and governance state

Product-facing language should use `athlete`, `trainer`, `admin`, `team`, `check-in`, and `report`. Legacy terms such as `child`, `assessment`, `conductor`, `observer`, and `survey` should remain limited to compatibility layers and migration context.

## Governance And Quality Gates

Core validation commands:

```bash
npm run lint
npm run test
npm run typecheck
npm run i18n:audit
npm run gds:audit
npm run gds:compliance
npm run build
```

Important rules:

- No local/demo/offline fallback data in production-facing flows.
- User-facing copy should live in message catalogs or structured localized content.
- Public news must fail closed by locale.
- GDS is the design/UI authority.
- Athlete access is self-scoped.
- Trainer access is team-scoped.
- Admin access is organization-scoped.
- Direct autonomous pushes to `main` are outside the automation policy; branch and pull-request delivery is expected.

## GitHub Project And Issue State

Operational board:

- Project 14: `{habigoal.com} - From IDEA to LIVE`
- URL: `https://github.com/users/moldovancsaba/projects/14`
- Current board item count observed: 81

Milestones:

- `GDS-only migration`: 5 open issues, 4 closed issues
- `Athlete IQ gap import`: 8 open issues, 5 closed issues
- `AthleteIQ integration backlog`: current high-priority integration stream

Current high-priority open work:

- `#84` Trainer Dashboard: Risk scan - persistent source-linked coaching alerts
- `#81` Guidance: Reflections and recommendations - source-linked insight memory
- `#72` GDS: Core surface migration - PageHeader, SectionCard, StateBlock, and metrics
- `#64` Habigoal: Build dedicated athlete-only check-in shell and task UX
- `#62` Habigoal: Eliminate hardcoded UI copy and add repeatable i18n audit gates
- `#58` Habigoal: Migrate daily check-in to the centralized form system
- `#57` Habigoal: Connect forms to i18n, visibility, and validation
- `#56` Habigoal: Build shared field registry and form renderer
- `#55` Habigoal: Build centralized form-definition foundation
- `#54` Habigoal: Build a centralized form system

Important next-tier work:

- `#89` interrupted request recovery without offline fallback
- `#88` privacy-safe telemetry
- `#86` versioned weekly summaries and authorized export
- `#85` athlete onboarding baseline
- `#83` session execution blueprint library and debrief capture
- `#82` micro-skill benchmarks and PDA gaps
- `#74` central GDS form contracts
- `#73` admin responsive data contracts
- `#65` automated weekly release-note news posts from GitHub activity
- `#63` team invitation workflow
- `#61` centralized form governance enforcement
- `#60` admin and team-management form migration
- `#59` athlete profile and baseline form migration

AthleteIQ integration execution pack:

- `#81`, `#84`, `#86`: active guidance and reliability stream for Phase 1 delivery.

Expansion backlog includes role/privacy controls, health events, return-to-play, parent summaries, task assignment, team hierarchy, integrations, testing library, match center, resources, finance, wearable/device integrations, and custom formulas.

## Current Risks

- Project board state can drift from repository state when merges happen without issue and board reconciliation.
- GitHub GraphQL project item details were rate-limited during this review; REST issue and milestone data were available.
- Centralized forms are the intended direction, but full rollout is not complete on `main`.
- Some compatibility names remain in files, APIs, and persistence.
- Team invitations are still admin-managed records, not a complete outbound invitation workflow.
- i18n quality must remain an engineering gate, not a late polish task.
- GDS migration issues need periodic reconciliation against actual package state, audits, docs, and code.

## Recommended Delivery Sequence

1. Reconcile `#62` against the current i18n audit implementation and close, narrow, or retitle it if the repeatable gate is already shipped.
2. Continue centralized forms foundation in order: `#54`, `#55`, `#56`, `#57`, then `#58`.
3. Build the dedicated athlete-only check-in shell in `#64` after the form foundation is stable enough to avoid duplicate page-owned logic.
4. Advance source-linked guidance with `#81` before adding broader recommendation UI.
5. Advance persistent risk scanning with `#84` once source-linked memory contracts are clear.
6. Keep GDS work scoped to proven drift: `#72`, `#74`, `#73`, then public shell work in `#75`.
7. Move reporting toward versioned summaries and authorized export with `#86`, keeping report copy and locale coverage under the i18n gate.

## Working Summary

Habigoal is best treated as a production athlete-operations product with a clear core loop: capture daily signals, compute operating context, guide trainer action, reflect plans and summaries, and maintain strict access/i18n/GDS governance. The highest-leverage work now is not broad expansion; it is finishing the centralized form and source-linked guidance foundations that make every later athlete, trainer, reporting, and onboarding workflow more reliable.
