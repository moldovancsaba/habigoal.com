# Onboarding Architecture

Last updated: 2026-06-26

This document is the canonical onboarding contract for Habigoal. It reconciles the client-reported inconsistency between user manuals, popup/bubble onboarding journeys, and shipped route behavior. Any onboarding runtime change must update this document in the same delivery.

## Current Shipped State

Onboarding is implemented as a role-scoped, non-blocking prompt/checklist runtime. It is active only on routes wrapped with `OnboardingProvider` and only for modules that match the signed-in user's role and route.

Current runtime files:

- `types/onboarding.ts`: shared module, step, event, state, and view types.
- `lib/onboarding.ts`: module registry, locale route normalization, role/route eligibility, and state derivation.
- `repositories/onboarding.repository.ts`: MongoDB persistence for `onboarding_events`.
- `app/api/onboarding/state/route.ts`: state read API.
- `app/api/onboarding/events/route.ts`: idempotent event write API.
- `components/onboarding/OnboardingPrompt.tsx`: GDS-only modal/checklist renderer and provider.

Current provider mount points:

- `components/layout/DashboardShell.tsx`: dashboard shell onboarding for trainer/admin routes.
- `app/[locale]/athletes/[id]/page.tsx`: athlete profile onboarding.
- `app/[locale]/athletes/[id]/check-in/page.tsx`: athlete check-in onboarding.

## Goals

- Give athletes, trainers, and admins short contextual guidance without blocking the route.
- Keep onboarding state tied to authenticated user, route, module, and step.
- Keep all UI frontend work exclusively on the Sovereign Squad General Design System.
- Make failure states visible and recoverable.
- Prevent onboarding from exposing data outside the signed-in user's access boundary.

## Non-Goals

- Onboarding is not a training course platform.
- Onboarding does not expand user roles or route permissions.
- Onboarding does not create sample, demo, fallback, or offline-persisted data.
- Onboarding does not infer completion from untrusted client-only state.
- Onboarding is not allowed to bypass normal API authorization.

## Runtime Flow

```text
Route entry
  -> route is wrapped by OnboardingProvider
  -> provider reads localized pathname
  -> GET /api/onboarding/state?route=...
  -> server resolves authenticated user
  -> server loads persisted events for user email
  -> server filters ONBOARDING_MODULES by role and normalized route
  -> server derives module state and completed step ids
  -> provider selects first non-completed/non-dismissed/non-snoozed module
  -> GDS modal/checklist renders without blocking page content
  -> provider records shown/completed/dismissed events through POST /api/onboarding/events
  -> route remains usable on load, write, or state failures
```

## Module Registry

The module registry lives in `lib/onboarding.ts` as `ONBOARDING_MODULES`.

Current modules:

| Module id | Role | Route pattern | Priority | Purpose |
| --- | --- | --- | --- | --- |
| `athlete-first-login-baseline` | `athlete` | `/athletes` | `10` | Guide the athlete to use their own profile and complete a daily check-in. |
| `trainer-command-center` | `trainer` | `/dashboard` | `20` | Guide trainers through priority review and weekly planning. |
| `admin-settings-foundation` | `admin` | `/dashboard/settings` | `30` | Guide admins through users, teams, standards, restore, and governance setup. |

Route matching removes the locale prefix for `en`, `hu`, `ar`, `es`, `de`, and `he`, then matches either the exact route pattern or a child path.

## Data Model

```ts
type OnboardingEventType =
  | "shown"
  | "dismissed"
  | "snoozed"
  | "completed"
  | "failed";

type OnboardingModuleState =
  | "eligible"
  | "shown"
  | "dismissed"
  | "snoozed"
  | "completed"
  | "blocked"
  | "failed";

type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  completionEvent?: string;
};

type OnboardingModule = {
  id: string;
  role: AppRole;
  routePattern: string;
  priority: number;
  title: string;
  body: string;
  checklistTitle?: string;
  steps: OnboardingStep[];
};

type OnboardingEventRecord = {
  id?: string;
  userEmail: string;
  moduleId: string;
  event: OnboardingEventType;
  route: string;
  stepId?: string;
  idempotencyKey?: string;
  createdAt: string;
};

type OnboardingModuleView = OnboardingModule & {
  state: OnboardingModuleState;
  lastEventAt?: string;
  completedStepIds: string[];
};
```

Persistence collection: `onboarding_events`.

Stored fields are intentionally metadata-only. They must not include athlete notes, medical details, secrets, raw prompt text entered by users, or free-form personal data beyond the authenticated user email required for state ownership.

## Eligibility Rules

Server-side eligibility is authoritative.

```ts
resolveOnboardingModules(user, route, events)
  .filter((module) => user.roles.includes(module.role))
  .filter((module) => routeMatchesModule(route, module))
  .sort((a, b) => a.priority - b.priority)
  .map((module) => deriveStateFromEvents(module, events));
```

Rules:

- Athletes see only athlete modules and only on athlete routes they can access through normal route/API authorization.
- Trainers see only trainer modules and only on trainer dashboard surfaces.
- Admins see only admin modules and only on admin settings surfaces.
- Multiple eligible modules are ordered by numeric priority; the provider renders the first active module.
- A module becomes completed when every step with `completionEvent` has a matching completed step event, or when the module itself receives a module-level `completed` event.
- `dismissed` and `snoozed` suppress the module for that user until a future product change introduces expiry logic.

## API Contracts

### `GET /api/onboarding/state?route=/en/dashboard`

Returns eligible modules for the signed-in user and supplied route.

Auth:

- Requires a signed-in user.
- Returns `401 AUTH_REQUIRED` when no authenticated user exists.

Response:

```json
{
  "modules": [
    {
      "id": "trainer-command-center",
      "role": "trainer",
      "routePattern": "/dashboard",
      "priority": 20,
      "title": "Review the trainer command center",
      "body": "Use the priority queue, missed check-ins, recommendations, and planning context before making session decisions.",
      "checklistTitle": "Trainer workflow",
      "steps": [
        {
          "id": "review-queue",
          "title": "Review priority athletes",
          "body": "Start with support and missed-check-in athletes."
        }
      ],
      "state": "eligible",
      "completedStepIds": []
    }
  ]
}
```

### `POST /api/onboarding/events`

Records one onboarding event and returns the updated module state for the same route.

Auth:

- Requires a signed-in user.
- Server checks module role and route access before writing.
- Returns `403 FORBIDDEN` when the module does not exist or does not match the user's role/route.

Request:

```json
{
  "moduleId": "trainer-command-center",
  "event": "completed",
  "route": "/en/dashboard",
  "stepId": "save-plan",
  "idempotencyKey": "trainer-command-center:completed:save-plan:/en/dashboard"
}
```

Response:

```json
{
  "event": {
    "id": "event-id",
    "userEmail": "trainer@example.com",
    "moduleId": "trainer-command-center",
    "event": "completed",
    "route": "/en/dashboard",
    "stepId": "save-plan",
    "idempotencyKey": "trainer-command-center:completed:save-plan:/en/dashboard",
    "createdAt": "2026-06-26T10:00:00.000Z"
  },
  "modules": []
}
```

Validation:

- `moduleId` is required.
- `event` must be one of `shown`, `dismissed`, `snoozed`, `completed`, or `failed`.
- `route` defaults to `/` when omitted.
- `stepId` and `idempotencyKey` are optional and trimmed.
- Duplicate writes with the same `userEmail`, `moduleId`, and `idempotencyKey` return the original event.

## UX States

| State | Runtime behavior |
| --- | --- |
| `loading` | Provider fetches state; page content remains usable and no blocking overlay is shown. |
| `eligible` | The first eligible active module may render as a GDS modal/checklist. |
| `shown` | Runtime has recorded that the prompt displayed. The prompt may remain active until dismissed, snoozed, or completed. |
| `submitting` | Buttons are disabled while an event write is in flight. |
| `error` / `failed` | A GDS error state is shown with retry. The route remains usable. |
| `dismissed` | Module is hidden for the signed-in user. |
| `snoozed` | Module is hidden for the signed-in user; no expiry is currently implemented. |
| `completed` | Module is hidden once module-level completion or all completable steps are complete. |
| `blocked` | The module is not returned because role, route, or access does not match. |
| `unavailable` | API failure or missing route state must not block the page. Provider degrades to no prompt plus recoverable error state when a prompt action fails. |

## GDS And Accessibility Contract

All onboarding UI must use the Sovereign Squad General Design System. Current runtime uses `@doneisbetter/gds/client` primitives: `Modal`, `Stack`, `Group`, `Box`, `Badge`, `Progress`, `SemanticButton`, and `StateBlock`.

Release-blocking requirements:

- Keyboard users can open, traverse, complete, retry, and dismiss the prompt.
- Modal title and body are semantically connected through `aria-describedby`.
- Checklist progress has a text label; progress does not rely on color alone.
- Step states use text labels such as done/next.
- Focus is visible through GDS focus styling.
- Buttons expose semantic action labels through `SemanticButton`.
- No onboarding action is hover-only or pointer-only.
- Reduced-motion users must not require animation to understand state changes.
- Arabic and Hebrew routes must remain RTL-safe; layout must not assume left-to-right ordering.
- Color, spacing, radius, typography, and overlays must use GDS primitives/tokens. Page-local visual systems are not permitted.

Known accessibility follow-up:

- Runtime uses shipped GDS modal behavior. Any future popover/bubble variant must prove focus trap, focus restoration, escape handling, outside-click behavior, and screen-reader labeling before replacing the modal pattern.

## Role Boundaries

Onboarding must never reveal product concepts outside the signed-in user's authorization scope.

- Athlete modules cannot mention other athletes, team management, settings, restore bins, or governance metrics.
- Trainer modules cannot expose admin user management, global settings writes, or athletes outside assigned teams.
- Admin modules can reference settings and governance, but must not include sensitive athlete notes.
- The state and event APIs must keep using normal auth via `getAuthUser()` and must not create a bypass path for route data.

## Observability

Current persisted events provide the operational audit trail for onboarding:

- `userEmail`
- `moduleId`
- `event`
- `route`
- `stepId`
- `idempotencyKey`
- `createdAt`

Operational expectations:

- Track event counts by module and event type.
- Track repeated write failures and invalid payload rates.
- Track modules that remain eligible but never complete.
- Logs must not include sensitive athlete notes, medical details, secrets, or raw form content.
- Future telemetry must use a correlation id and metadata-only payloads.

## Retries, Timeouts, And Recovery

- State loading uses `cache: "no-store"` so role/route changes are reflected immediately.
- State load failures clear modules and keep the page usable.
- Event write failures keep the current prompt visible and show retry.
- Event writes are idempotent when an `idempotencyKey` is supplied.
- Duplicate browser submissions must not create duplicate completion state.
- Route changes trigger a fresh state load through the pathname dependency.
- There is no offline persistence fallback. Transient in-memory state is allowed only for the current mounted provider lifecycle.

## Rollback

Rollback options are non-destructive:

1. Remove or disable `OnboardingProvider` from the route wrapper to suppress prompts.
2. Leave `onboarding_events` records intact for future recovery.
3. Re-enable provider once the issue is corrected; state can be recomputed from existing events.

Rollback must not delete event history unless a privacy/legal deletion request requires it.

## Edge Cases

- Missing user: APIs return `AUTH_REQUIRED`; provider should not render onboarding.
- Unauthorized module/route: event write returns `FORBIDDEN`.
- Unknown event type: event write returns `INVALID_PAYLOAD`.
- Multiple roles: modules can match any role in `user.roles`; priority determines ordering.
- Multiple eligible modules: provider renders the first active module by priority.
- Step without `completionEvent`: can render as informational and does not block step-derived completion.
- Missing locale key: runtime module text currently lives in registry strings; future i18n migration must fail visibly in tests rather than silently falling back cross-locale.
- Stale dismissed state: no expiry is currently implemented; future snooze expiry must be explicit and tested.
- API unavailable: page remains usable; prompt state degrades rather than blocking.
- Route changes while prompt is open: provider reloads state for the new pathname.

## Testing Expectations

Current automated coverage:

- `lib/onboarding.test.ts` verifies locale route normalization, role/route filtering, dismissed state, and partial step completion.

Required checks for onboarding changes:

```bash
npm run test -- lib/onboarding.test.ts
npm run typecheck
npm run build
```

Run `npm run i18n:audit` when onboarding user-facing copy or message keys change.

Manual verification path:

- Athlete route: eligible athlete sees only athlete setup prompt.
- Trainer dashboard: trainer sees trainer command-center prompt and no admin setup module.
- Admin settings: admin sees admin setup prompt.
- Dismiss action hides the module after reload.
- Step completion updates checklist progress.
- Simulated API failure keeps the route usable and shows retry for prompt actions.
- RTL locale routes load without layout overlap.

## Documentation Links

This document is referenced by:

- `docs/api.md`
- `docs/settings-guide.md`
- `docs/user-guide.md`
- Client QA issue `#214`

Manuals must describe only the runtime behavior that exists. Future onboarding issue work must not claim a bubble/popover journey is shipped until the GDS-only primitive and route wiring are implemented and verified.

## Handover

What changed:

- `docs/onboarding-architecture.md` is the source of truth for onboarding lifecycle, APIs, role boundaries, GDS/accessibility behavior, retries, rollback, and tests.

Configuration:

- No new environment variables.
- Runtime depends on existing auth and MongoDB configuration.

Known limitations:

- Prompt copy is defined in the module registry, not fully externalized into locale message catalogs.
- Snooze has no expiry policy.
- The current shipped primitive is a GDS modal/checklist, not a separate anchored bubble/popover.

Rollback plan:

- Revert this document if the contract is rejected.
- For runtime rollback, remove `OnboardingProvider` from affected route wrappers without deleting persisted events.
