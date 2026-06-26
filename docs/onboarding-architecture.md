# Onboarding Architecture

Last updated: 2026-06-26

Habigoal onboarding is a role-scoped runtime layer for short, recoverable guidance prompts. It exists to explain real shipped workflows without blocking the core athlete, trainer, or admin surfaces.

## Runtime Flow

```text
Route entry
  -> authenticated user and role context
  -> onboarding module registry
  -> route and role eligibility
  -> persisted event state
  -> GDS-only prompt/checklist renderer
  -> idempotent event recording
  -> completion, dismissal, or recovery state
```

## Ownership

- `lib/onboarding.ts`: module registry, route matching, eligibility, and state derivation.
- `repositories/onboarding.repository.ts`: MongoDB persistence for onboarding events.
- `app/api/onboarding/state/route.ts`: current eligible modules for the signed-in user and route.
- `app/api/onboarding/events/route.ts`: idempotent event recording.
- `components/onboarding/OnboardingPrompt.tsx`: GDS-only prompt/checklist renderer and provider.

## Contracts

```ts
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

type OnboardingModuleState =
  | "eligible"
  | "shown"
  | "dismissed"
  | "snoozed"
  | "completed"
  | "blocked"
  | "failed";
```

## APIs

### `GET /api/onboarding/state?route=/en/dashboard`

Returns the signed-in user's eligible modules for the supplied route.

### `POST /api/onboarding/events`

Records an onboarding event:

```json
{
  "moduleId": "trainer-command-center",
  "event": "completed",
  "route": "/en/dashboard",
  "stepId": "save-plan",
  "idempotencyKey": "trainer-command-center:completed:save-plan:/en/dashboard"
}
```

Supported events are `shown`, `dismissed`, `snoozed`, `completed`, and `failed`.

## UX States

- `loading`: route remains usable while onboarding state loads.
- `eligible`: prompt may be shown.
- `shown`: prompt has been displayed.
- `dismissed` / `snoozed`: prompt is hidden for the signed-in user.
- `completed`: module or step is complete.
- `failed`: update failed and retry is visible.
- `blocked`: module is not available because role or route prerequisites are not met.

## Accessibility

All onboarding UI must use the General Design System. Prompt behavior must support keyboard operation, focus restoration, visible focus states, labeled controls, screen-reader descriptions, reduced motion, and RTL-safe layout.

## Observability

Onboarding events are metadata only: user email, module id, event, route, optional step id, optional idempotency key, and timestamp. Events must not contain athlete notes, medical details, secrets, or free-form personal-data payloads.

## Retry And Timeout Behavior

The route must remain usable if onboarding state fails. Failed event writes keep the prompt open with a visible retry or dismiss action. Duplicate events with the same idempotency key return the original event.

## Rollback

Disable `OnboardingProvider` usage to remove runtime prompts while leaving route behavior and persisted events intact.
