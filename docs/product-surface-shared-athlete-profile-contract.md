# Product Surface Shared Athlete Profile Contract

## Purpose

This document defines the production relationship between Habigoal and Athlete IQ.

Habigoal is not a copy of Athlete IQ. Habigoal is a filtered, mobile-first product surface over the same athlete identity, profile, and history that Athlete IQ uses. Athlete IQ is the professional operating surface for trainers, clubs, teams, and pro-athlete workflows.

This is a product architecture invariant. Any auth, routing, data, UI, reporting, or engine change that touches either product surface must preserve this contract.

## Product Model

### Habigoal

Habigoal is the home and daily habit app.

Primary outcomes:

- make the daily journey simple enough to use at home
- help the user build habits through repeatable daily actions
- collect wellbeing, check-in, habit, and support signals
- return clear personal status and one safe next action
- keep the interface mobile-first and app-like

Habigoal exposes a narrower usability model, but it is still a full live app. It must never use demo data, presentation wording, lorem ipsum, fake measurements, or local database fallback.

### Athlete IQ

Athlete IQ is the professional performance operating system.

Primary outcomes:

- manage teams, clubs, trainers, and individual athletes
- interpret historical and current signals for professional performance workflows
- provide dashboards, reporting, planning, services, team operations, and advanced intelligence
- allow trainers and authorized staff to work with athlete data through role, assignment, and consent boundaries

Athlete IQ can consume the data Habigoal users record because the underlying athlete profile and history are the same.

## Non-Negotiable Rules

- One user identity can have access to one or both product surfaces.
- One athlete has one canonical athlete profile and one measurement history.
- Habigoal writes to the canonical athlete profile, not to a separate Habigoal-only profile.
- Athlete IQ reads from the same canonical athlete profile and can use Habigoal-created history when access rules allow it.
- Habigoal-only users must not be able to enter Athlete IQ.
- Athlete IQ users may use Habigoal as a simpler home capture app.
- Trainer access to Habigoal-created history requires Athlete IQ entitlement, athlete assignment, and the applicable consent/access checks.
- Product separation is enforced by entitlements and route/API authorization, not only by hiding navigation.
- The selector is an app selector, not a presentation page.
- UI surfaces must remain different: Habigoal is mobile habit support; Athlete IQ is professional performance operations.
- In Habigoal, daily status is an outcome after today's check-in and habits are recorded. It must not be the first primary result shown before the user completes the daily loop.

## Entitlement Model

The implementation target is separate product entitlement from data ownership.

```ts
type ProductSurface = "habigoal" | "athlete-iq";
type Persona = "athlete" | "trainer" | "admin";

type ProductEntitlements = {
  habigoal: {
    enabled: boolean;
    reason: "self_registered" | "aiq_member" | "admin_grant";
  };
  athleteIq: {
    enabled: boolean;
    reason:
      | "team_athlete"
      | "pro_athlete_membership"
      | "trainer_assignment"
      | "club_staff"
      | "admin_grant";
  };
};
```

Rules:

- A self-registered user receives Habigoal access by default.
- A self-registered athlete persona receives Habigoal access by default and does not receive Athlete IQ access.
- During the pseudo-login phase, selecting the trainer persona provisions Athlete IQ trainer access so the user can enter the professional workspace before SSO is rolled out.
- Athlete IQ access requires a professional entitlement: team membership, trainer assignment, club staff role, pro-athlete membership, or admin grant.
- The same email or username can log in to Habigoal and Athlete IQ only when the user has the required entitlement for each surface.
- Choosing the athlete persona must not grant Athlete IQ access.
- Choosing the trainer persona is treated as a professional onboarding request in pseudo-login and grants the provisional `trainer_assignment` entitlement.

## Runtime Flow

### Habigoal Entry

1. User selects Habigoal.
2. Login collects email or username and persona.
3. Server normalizes identity and creates or updates the user record.
4. Server resolves Habigoal entitlement.
5. If allowed, server ensures a canonical athlete profile shell exists.
6. New users start empty: no score, no check-in, no habits, no measurements.
7. Habigoal loads the filtered daily projection from canonical athlete data.
8. If today is incomplete, the UI guides the user through daily check-in, then habits, then review/save.
9. The user records daily habits and saves the daily operation.
10. The save writes to canonical check-in and habit collections.
11. The backend calculates today's status from the saved daily operation.
12. The UI shows status, rationale, and next action after save succeeds.
13. Athlete IQ engines can consume the same records when professional access exists later.

### Athlete IQ Entry

1. User selects Athlete IQ.
2. Login collects email or username and persona.
3. Server normalizes identity and resolves professional entitlements. In pseudo-login, trainer persona creates or preserves `trainer_assignment` access.
4. If the user still lacks Athlete IQ access, the server denies entry and offers Habigoal when allowed.
5. If allowed, Athlete IQ loads the professional workspace.
6. Trainers see only assigned athletes and allowed data.
7. Athlete IQ dashboards and reports include Habigoal-created history as part of the athlete timeline.

## Data Ownership

Canonical operational data lives in MongoDB Atlas.

Current compatible collections:

- `users`: identity, roles, product entitlements, linked athlete id
- `children`: canonical athlete profile until the compatibility collection is renamed or migrated
- `assessments`: check-in records until the compatibility collection is renamed or migrated
- `habit_records`: daily habit state
- `teams`: team, club, trainer, and athlete membership
- `coach_actions`: professional trainer action state
- `training_load_records`: professional training-load records

Product code should use athlete, check-in, habit, team, and entitlement language even when persisted compatibility names remain.

## Projection Contract

Habigoal projections are filtered personal projections. Athlete IQ projections are professional operational projections.

Both projections read from the same canonical data sources.

Habigoal projection rules:

- show only personal daily signals and habit outcomes
- hide professional team, club, trainer, report, and planning controls
- return `score: null` when no live daily data exists
- return no current-day status result until the required daily check-in and habit recording steps are complete
- provide simple next action guidance, not professional analytics language

Athlete IQ projection rules:

- show team and individual athlete management when entitlement permits
- include Habigoal-created daily signals in athlete history
- separate missing data from neutral data
- preserve access and consent boundaries in every professional view

## API And Authorization Contracts

Required server contracts:

- `POST /api/auth/login` must validate requested product access before redirecting.
- `GET /api/auth/me` should expose current identity, persona, and product entitlements without leaking unavailable product data.
- Habigoal APIs must require Habigoal entitlement and athlete self-access.
- Athlete IQ APIs must require Athlete IQ entitlement plus trainer, team, athlete, admin, or consent access.
- Product API handlers must not rely on client-side navigation hiding for security.

Authorization pseudo-code:

```ts
const entitlements = await resolveProductEntitlements(user);

if (requestedSurface === "habigoal" && !entitlements.habigoal.enabled) {
  return deny("HABIGOAL_ACCESS_REQUIRED");
}

if (requestedSurface === "athlete-iq" && !entitlements.athleteIq.enabled) {
  return deny("ATHLETE_IQ_ACCESS_REQUIRED");
}

if (requestedSurface === "athlete-iq" && role === "trainer") {
  await requireTrainerAssignment(user.id, athleteId);
}

if (requestedSurface === "habigoal") {
  await requireSelfAthleteAccess(user.id, athleteId);
}
```

## Implementation Plan

### Habigoal UX Journey Map

Status is the result of the daily loop. The user must first record today's signals and habits; only then does Habigoal show the daily status and next action.

| Step | User intent | UI state | System behavior | Result |
| --- | --- | --- | --- | --- |
| 1. Select app | Open the correct app | App selector shows Habigoal and Athlete IQ as two real apps | Routes user to login with requested surface | User is in the Habigoal entry path |
| 2. Login/register | Enter with email or username | Minimal pseudo login with persona selection | Creates or resolves user and Habigoal entitlement | User is authenticated for Habigoal |
| 3. First daily screen | Understand what to do today | Empty or in-progress daily loop, not a status hero | Loads canonical profile and today's completion state | User sees the next required action |
| 4. Daily check-in | Record today's wellbeing signals | Mobile-first inputs for energy, mood, sleep, soreness, and any configured signals | Keeps values local until save or stores draft if implemented | Check-in step becomes complete |
| 5. Daily habits | Record habit completion | Habit list with clear completed/not-completed controls | Keeps selected habits tied to today's operation | Habit step becomes complete |
| 6. Review and save | Confirm the day | Review screen summarizes check-in and habits with one primary save action | `POST /api/habigoal/daily-operation` writes canonical data with idempotency | Daily operation is persisted |
| 7. Status result | See outcome after action | Status, reason, confidence, and one next action appear after save success | Backend calculates status from saved daily data | User gets the daily outcome |
| 8. Return later | Continue or update today | Completed-day summary with edit/update affordance | Reads persisted projection from Atlas | User sees today's saved status and can update if allowed |
| 9. AIQ later access | Join a team/pro context | No Habigoal UI is embedded in AIQ | AIQ reads the same canonical history through entitlements | Trainer/pro surface can use historical Habigoal data |

#### Habigoal UI State Contract

- `empty_day`: no current-day operation exists; show start action, not status.
- `check_in_in_progress`: required check-in values are incomplete; keep save/status disabled.
- `habits_in_progress`: check-in is complete, habits are not recorded; keep status unavailable.
- `ready_to_save`: check-in and habits are complete; show review and save.
- `saving`: disable repeated submit, preserve visible progress, expose retry only after failure.
- `saved_status`: show status, contributing reasons, confidence, and one next action.
- `save_failed_retryable`: show retry with correlation id and keep entered values.
- `save_failed_blocked`: show clear blocking reason and do not calculate client-side status.

#### UX/UI Fix Requirements

- Move daily status below the completed daily loop. The first primary action for an incomplete day is recording today, not reading a score.
- Do not show a numeric status, readiness label, or support label before current-day check-in and habit data are saved.
- If a user has a previous completed day but today is incomplete, show previous history as secondary context and keep today's primary CTA on recording today.
- The bottom navigation may include Today, Check-in, Habits, and Status, but Status is disabled or explanatory until today's required steps are complete.
- Progress indicators should reflect journey completion: check-in recorded, habits recorded, saved, status available.
- All controls must use GDS components, visible focus states, labels, disabled-state reasons, and localized strings.
- The client must not calculate the final status locally. It may show form completion progress only; final status comes from the backend projection after save.

### Phase 1: Contract And Audit Gate

Goal: prevent future code from treating the products as duplicate apps or separate data stores.

Work:

- Add this contract to engineering documentation.
- Link it from architecture, API, and Habigoal delivery docs.
- Add a product-boundary audit that checks for forbidden claims such as Habigoal being a demo, a copied AIQ surface, or a separate data store.
- Add tests for `includedSurfaceIds` semantics so "Athlete IQ includes Habigoal" means shared data capability, not UI nesting.

Acceptance:

- Documentation states one identity, one athlete profile, one history.
- Audit fails if product copy says Habigoal is demo/presentation-only or a copy of AIQ.

### Phase 2: Entitlement Schema

Goal: model product access separately from role labels.

Work:

- Extend `users` records with product entitlements.
- Preserve current roles while adding explicit surface access.
- Add repository helpers for resolving and updating entitlements.
- Backfill existing users conservatively:
  - current athlete users keep Habigoal
  - current trainer/admin users keep Athlete IQ
  - existing AIQ-linked athletes receive Athlete IQ only when team/pro membership exists
- Document migration and rollback.

Acceptance:

- Self-registration creates Habigoal access, not Athlete IQ access.
- AIQ access can be granted without creating a second athlete profile.
- Existing users are not silently given broader professional access.

### Phase 3: Login And Route Enforcement

Goal: make the selector and login honor product entitlements.

Work:

- Update `POST /api/auth/login` to resolve requested surface access before redirect.
- Add `canOpenProductSurface(user, surface)` in the access layer.
- Protect `/{locale}/habigoal` with Habigoal entitlement.
- Protect `/{locale}/athlete-iq` and `/dashboard/*` Athlete IQ routes with Athlete IQ entitlement.
- Add API middleware/helpers for Habigoal and Athlete IQ route handlers.
- Add UX states for "Habigoal available" and "Athlete IQ requires team/pro access".

Acceptance:

- Habigoal-only users cannot reach Athlete IQ by direct URL.
- Athlete IQ users can choose Habigoal and record data into the same profile.
- Login redirection cannot cross into the wrong product surface.

### Phase 4: Shared Athlete Profile Write Path

Goal: ensure Habigoal writes become AIQ history without fake records.

Work:

- Keep first-use Habigoal profile creation as an empty canonical athlete shell.
- Ensure Habigoal daily operation writes check-ins and habits against the canonical athlete id.
- Add idempotency keys for daily writes.
- Keep missing values nullable, not zero-filled.
- Add integration tests proving a Habigoal save appears in the professional athlete history query when AIQ access is granted.

Acceptance:

- A new Habigoal user starts empty.
- Saving Habigoal check-in/habits writes to MongoDB Atlas only.
- The same records appear in AIQ athlete history after professional entitlement is added.

### Phase 5: Athlete IQ Professional Read Path

Goal: make AIQ consume Habigoal history through professional projections.

Work:

- Update AIQ team and individual dashboards to include Habigoal daily status and habit history as one input source.
- Keep professional outputs distinct from Habigoal personal guidance.
- Add team-level rollups for assigned athletes only.
- Add empty, partial, stale, and unavailable states.
- Add access tests for trainers, athletes, admins, and denied users.

Acceptance:

- Trainers see Habigoal-created history only for assigned athletes.
- AIQ dashboard does not send users to the Habigoal UI.
- Habigoal personal next action copy does not appear as professional trainer instruction.

### Phase 6: UX And Content Separation

Goal: keep the apps visibly and behaviorally distinct while sharing data.

Work:

- Habigoal remains mobile-first with bottom navigation, simple daily actions, and personal progress states.
- Rebuild the Habigoal daily flow around the journey order: entry, check-in, habits, review/save, then status.
- Move status from primary pre-input content into the post-save result state for incomplete days.
- Add a Status tab/state that is unavailable with a clear reason until today's check-in and habits are recorded.
- Add a returning-user state that shows today's saved status only when the current-day operation exists; otherwise previous history remains secondary.
- Athlete IQ remains desktop-first with team, club, trainer, and athlete management surfaces plus mobile responsive views.
- Remove product copy that implies either app is a demo, presentation shell, duplicate, or temporary selector.
- Keep all UI on the General Design System.
- Add a11y checks for product-specific empty/error/saved/access-denied states.

Acceptance:

- The selector presents two real apps.
- Habigoal feels like a mobile habit app.
- Habigoal status appears only after today's habits and check-in are recorded and saved.
- Habigoal incomplete-day screens never show a fake, stale, or client-calculated current status as the primary result.
- Athlete IQ feels like a professional team operating app.
- Both surfaces can be understood without internal engine names.

### Phase 7: Operations, Migration, And Release Gate

Goal: make the shared profile model supportable in production.

Work:

- Add structured events for entitlement resolution, denied product access, profile linking, and cross-surface history reads.
- Redact emails, wellness values, habit text, and medical details from logs.
- Add migration scripts for linking duplicate identities or profiles.
- Add rollback steps for entitlement changes and profile linking.
- Extend release gate to cover:
  - Habigoal-only user denied from AIQ
  - AIQ user allowed into both surfaces
  - Habigoal incomplete-day journey starts with daily recording, not status
  - Habigoal status appears only after check-in and habits are saved
  - Habigoal save visible in AIQ history after entitlement
  - trainer sees assigned athlete data only
  - direct URL bypass denied

Acceptance:

- Release gate proves the shared-data/separate-entitlement model end to end.
- Support can trace product access failures by correlation id.
- Rollback does not delete athlete history.

## File-Level Implementation Targets

- `lib/access.ts`: product entitlement resolution and route/API guards.
- `repositories/user.repository.ts`: entitlement persistence and lookup helpers.
- `repositories/child.repository.ts`: canonical athlete profile linking.
- `repositories/team.repository.ts`: professional team and trainer access resolution.
- `app/api/auth/login/route.ts`: requested-surface validation and redirect safety.
- `app/api/auth/me/route.ts`: current user and product entitlement payload.
- `services/habigoal-product.service.ts`: filtered personal projection from canonical athlete data.
- `services/athleteiq-*.ts`: professional projections consuming canonical Habigoal-created history.
- `lib/product-surfaces.ts`: selector metadata and product relationship semantics.
- `messages/*.json`: user-facing copy for selector, login, access-denied, empty states, saved states, and professional states.
- `scripts/*audit*.mjs`: product-boundary, i18n, GDS, and release-gate checks.

## Testing Matrix

- Unit: entitlement resolver, access guards, projection filters.
- Repository: user entitlement persistence, profile link creation, duplicate prevention.
- API: login redirect, denied direct URL, Habigoal save, AIQ professional read.
- Integration: Habigoal save becomes AIQ history after entitlement.
- A11y: login, selector, Habigoal empty/save/error, AIQ denied/authorized states.
- i18n: all entitlement and surface-state messages across supported locales.
- Security: Habigoal-only user cannot call AIQ APIs; trainer cannot read unassigned athlete.
- Regression: no fake data, no local DB fallback, no demo/presentation copy.

## Rollback Principles

- Never delete Habigoal-created athlete history during entitlement rollback.
- If AIQ entitlement enforcement is too strict, grant access explicitly; do not weaken route guards globally.
- If profile linking creates a duplicate, preserve both records until a manual merge script runs.
- If Habigoal daily writes fail, disable the submit path only; do not restore fake scores or local fallback data.
