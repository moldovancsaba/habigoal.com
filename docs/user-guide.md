# Habigoal User Guide

Last updated: 2026-06-26

Habigoal has three operating roles: athlete, trainer, and admin. Public visitors can read the landing page, news, and legal pages. Personal athlete data requires an authenticated Habigoal session when `HABIGOAL_ENFORCE_AUTH=true`.

Route references in this guide were checked against the `app/` route tree on 2026-06-26. A route that is not listed here must be treated as internal, compatibility-only, or planned until the guide is updated.

## Public Pages

- `/{locale}`: landing page with entry buttons for athlete app, trainer app, and news.
- `/{locale}/habigoal`: simple Habigoal product surface for habits, wellbeing support, status capture, and lightweight guidance.
- `/{locale}/athlete-iq`: professional Athlete IQ product surface for coaches, academies, dashboards, services, and advanced performance workflows. Athlete IQ includes Habigoal concepts through shared contracts, but the simple Habigoal UI remains separate.
- `/{locale}/services`: public sport services and training directory.
- `/{locale}/services/[id]`: public service detail page for a listed service.
- `/{locale}/news`: public release notes and product updates.
- `/{locale}/news/[slug]`: locale-specific news detail page.
- `/{locale}/legal/gtc`: public terms.
- `/{locale}/legal/privacy`: public privacy policy.

News posts are locale-specific. A post appears only in the languages explicitly stored in `content/news/posts.json`.

## Athlete Experience

Athletes use `/{locale}/athletes` and `/{locale}/athletes/[id]`.

When signed in, an athlete should land on their own athlete profile and should not see an athlete selector or another athlete's data. Trainer and admin users who open `/{locale}/athletes` are redirected to `/{locale}/dashboard/athletes` when authentication is enforced.

Athletes can:

- view their own readiness history and operating summary
- save first-login baseline setup fields such as weekly goal, preferred training days, and support preferences
- complete their own daily check-in at `/{locale}/athletes/[id]/check-in`
- record standalone training load at `/{locale}/athletes/[id]/training-log` when the workflow exposes the entry point
- track habits and task-like routines with weighted training, recovery, wellness, and learning contribution
- see training load, memory summaries, and weekly context that belongs to their own profile

Athletes cannot:

- browse other athletes
- open trainer dashboard pages
- manage users, teams, settings, restore bins, or governance metrics

Empty or partial athlete surfaces should explain the missing source and show the next safe action, such as starting the athlete's own daily check-in. Habigoal must not inject sample/demo data to fill an empty state.

Athlete onboarding prompts can appear on athlete profile and check-in routes through the shared GDS modal/checklist runtime. They are short, dismissible, snoozable, keyboard-accessible prompts that guide the athlete to open their own profile and complete a daily check-in. If onboarding state cannot load, the athlete route remains usable. Anchored popup/bubble onboarding is not separately shipped; future bubble variants must satisfy `docs/onboarding-architecture.md` before manuals describe them as available.

## Trainer Experience

Trainers use `/{locale}/dashboard`.

Trainers can:

- review the command center and priority athlete queue
- use the coach hub at `/{locale}/dashboard/coach`
- see missed check-ins, support alerts, readiness buckets, and recommendations
- open assigned athlete profiles
- start or update check-ins for team athletes
- track coach action status
- create and review weekly session plans
- review team reports at `/{locale}/dashboard/reports`
- review wearable connection surfaces at `/{locale}/dashboard/wearables`
- review digital twin context at `/{locale}/dashboard/digital-twin`
- read team-scoped data through the API and dashboard

Trainer onboarding prompts can appear on trainer dashboard surfaces through the shared GDS modal/checklist runtime. They explain the priority queue, team scope, planning, and recommendation workflows without blocking dashboard access.

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
- use the same trainer dashboard, planning, report, wearable, and athlete management routes when their admin role allows it

Admins should keep at least one valid admin account active. The API prevents deleting or demoting the final admin.

Admin onboarding prompts can appear on settings surfaces through the shared GDS modal/checklist runtime. They explain user rights, team membership, standards, restore controls, and governance metrics. Non-admin users do not receive admin onboarding modules.

## Parent / Guardian Experience

The parent route `/{locale}/dashboard/parent` exists for parent or guardian-scoped dashboard access. Parent users are redirected there from other dashboard routes when authentication is enforced. Parent users must not be documented as having trainer or admin powers unless a future role policy explicitly ships that behavior.

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

## Dashboard Route Truth

The shipped localized dashboard pages are:

- `/{locale}/dashboard`: trainer/admin command center
- `/{locale}/dashboard/coach`: coach hub
- `/{locale}/dashboard/planning`: weekly session planning
- `/{locale}/dashboard/athletes`: athlete management list
- `/{locale}/dashboard/athletes/[id]`: athlete operating detail
- `/{locale}/dashboard/athletes/[id]/profile`: athlete profile edit/detail surface
- `/{locale}/dashboard/athletes/[id]/intelligence`: athlete intelligence surface
- `/{locale}/dashboard/athletes/[id]/vision`: athlete media/vision surface
- `/{locale}/dashboard/records`: check-in record list
- `/{locale}/dashboard/records/[id]`: check-in record detail
- `/{locale}/dashboard/reports`: reporting surface
- `/{locale}/dashboard/wearables`: wearable/device connection surface
- `/{locale}/dashboard/digital-twin`: athlete digital twin context
- `/{locale}/dashboard/assessment`: trainer/admin check-in flow
- `/{locale}/dashboard/settings`: admin settings

Compatibility routes without the locale prefix, such as `/athlete-portal` and `/dashboard/injury-hub/fms`, are not the primary client-facing manual paths.

## Reports

Athlete and record pages support PDF export. Reports should use localized labels from the message catalogs. If copy changes, run `npm run i18n:audit` before release.

## Version And Release Truth

Habigoal displays the app version in the dashboard footer and public legal pages. The app version source is `lib/app-version.ts`, and it must stay aligned with `package.json`, `package-lock.json`, README, and `docs/legal.md`.

Other version domains are separate:

- Readiness standards versions are managed in admin settings and can affect scoring interpretation.
- API/OpenAPI version metadata lives in `lib/openapi-spec.ts` and does not equal the app version.
- Product surface registry version metadata from `/api/product-surfaces` describes product-surface contract phase, not the app release version.
- Model and scoring versions describe local processing contracts and must not be presented as the app version.

Before release, run `npm run version:audit` and confirm that manuals do not claim unpushed local commits as released.

## Language And Theme

Supported languages:

- English: `en`
- Hungarian: `hu`
- Spanish: `es`
- German: `de`
- Arabic: `ar`
- Hebrew: `he`

Arabic and Hebrew use RTL layout. Theme selection is persisted with Habigoal storage/cookie names while still reading old cookie names for migration compatibility.
