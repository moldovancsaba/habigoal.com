# Habigoal User Guide

Last updated: 2026-05-21

Habigoal has three operating roles: athlete, trainer, and admin. Public visitors can read the landing page, news, and legal pages. Personal athlete data requires an authenticated Habigoal session when `HABIGOAL_ENFORCE_AUTH=true`.

## Public Pages

- `/{locale}`: landing page with entry buttons for athlete app, trainer app, and news.
- `/{locale}/news`: public release notes and product updates.
- `/{locale}/legal/gtc`: public terms.
- `/{locale}/legal/privacy`: public privacy policy.

News posts are locale-specific. A post appears only in the languages explicitly stored in `content/news/posts.json`.

## Athlete Experience

Athletes use `/{locale}/athletes`.

When signed in, an athlete should land on their own athlete profile and should not see an athlete selector or another athlete's data.

Athletes can:

- view their own readiness history and operating summary
- complete their own daily check-in
- track habits and task-like routines with weighted training, recovery, wellness, and learning contribution
- see training load, memory summaries, and weekly context that belongs to their own profile
- record standalone training-load entries when the workflow exposes the ledger entry point

Athletes cannot:

- browse other athletes
- open trainer dashboard pages
- manage users, teams, settings, restore bins, or governance metrics

## Trainer Experience

Trainers use `/{locale}/dashboard`.

Trainers can:

- review the command center and priority athlete queue
- see missed check-ins, support alerts, readiness buckets, and recommendations
- open assigned athlete profiles
- start or update check-ins for team athletes
- track coach action status
- create and review weekly session plans
- read team-scoped data through the API and dashboard

Trainers cannot:

- access admin settings
- manage global users unless explicitly permitted by future admin policy
- see athletes outside their team membership

## Admin Experience

Admins use `/{locale}/dashboard/settings`.

Admins can:

- manage approved users and roles
- link athlete users to athlete profiles
- manage teams and trainer/athlete membership
- manage locations, company/legal profile, readiness standards, and alert thresholds
- inspect restore bins and governance metrics
- restore soft-deleted athletes and check-ins

Admins should keep at least one valid admin account active. The API prevents deleting or demoting the final admin.

## Daily Check-In

The trainer/admin check-in route is `/{locale}/dashboard/assessment`.

The check-in captures:

- athlete identity
- session context
- nine readiness signals across physical readiness, mental balance, and sport brain
- training load: session type, duration, RPE, and optional external load
- professional notes
- consent flags
- optional evidence attachments through ImgBB

Athlete users can submit only for their linked athlete profile.

## Reports

Athlete and record pages support PDF export. Reports should use localized labels from the message catalogs. If copy changes, run `npm run i18n:audit` before release.

## Language And Theme

Supported languages:

- English: `en`
- Hungarian: `hu`
- Spanish: `es`
- German: `de`
- Arabic: `ar`
- Hebrew: `he`

Arabic and Hebrew use RTL layout. Theme selection is persisted with Habigoal storage/cookie names while still reading old cookie names for migration compatibility.
