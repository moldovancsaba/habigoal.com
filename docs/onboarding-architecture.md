# Habigoal Onboarding Architecture

## Goal

Habigoal needs a modular onboarding system that can introduce the product across:

- roles: `athlete`, `trainer`, `admin`
- surfaces: landing, athlete app, dashboard, planning, settings, records, news
- features: check-in, habits, trends, memory, weekly summaries, planning, teams, permissions, reports
- states: first login, empty state, first success, newly released feature, reroute / permission explanation

The system should avoid a single long product tour. It should prefer small reusable modules that can be composed per user, route, role, and product state.

## Product Principles

1. Onboarding must be role-aware.
2. Onboarding must be route-aware.
3. Onboarding must be permission-aware.
4. Onboarding must be progressive rather than exhaustive.
5. Onboarding must be versioned so new features can trigger targeted "what's new" prompts.
6. Onboarding must reuse existing product surfaces such as `news`, empty states, and existing cards instead of inventing a separate learning product.

## Recommended Module Types

Use only five module types:

1. `intro`
- short modal that explains the purpose of a surface

2. `tour`
- ordered coachmarks anchored to UI selectors

3. `checklist`
- persistent, actionable "do these next" list

4. `hint`
- one-off inline contextual prompt near a control or card

5. `release`
- weekly or version-based feature introduction tied to release notes

## System Layers

### 1. Onboarding Definitions

Store declarative onboarding definitions in code, not in hardcoded components.

Recommended location:

```txt
lib/onboarding/definitions/
  athlete.ts
  trainer.ts
  admin.ts
  shared.ts
```

Each definition should describe:

```ts
type OnboardingRole = "athlete" | "trainer" | "admin";
type OnboardingModuleType = "intro" | "tour" | "checklist" | "hint" | "release";

type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  selector?: string;
  placement?: "top" | "right" | "bottom" | "left" | "center";
  route?: string;
};

type OnboardingModuleDefinition = {
  id: string;
  role: OnboardingRole | "shared";
  type: OnboardingModuleType;
  version: string;
  priority: number;
  routePatterns: string[];
  prerequisites?: string[];
  completionEvent?: string;
  dismissible: boolean;
  steps: OnboardingStep[];
  conditions?: {
    requiresEmptyState?: boolean;
    requiresLinkedAthlete?: boolean;
    requiresTeamMembership?: boolean;
    requiresAuth?: boolean;
  };
};
```

### 2. Onboarding State

Persist per-user onboarding state outside the `users` document.

Recommended collection:

```txt
onboarding_state
```

Recommended shape:

```ts
type OnboardingStateRecord = {
  _id?: string;
  userEmail: string;
  completedModules: string[];
  dismissedModules: string[];
  seenReleaseVersions: string[];
  checklistProgress: Record<string, string[]>;
  lastSuggestedModule?: string;
  updatedAt: string;
};
```

This allows:

- tracking completion by module
- tracking dismissal separately from completion
- replaying updated modules when version changes
- releasing targeted feature onboarding after weekly news posts

### 3. Onboarding Engine

The engine decides what is eligible right now.

Recommended location:

```txt
lib/onboarding/engine.ts
lib/onboarding/types.ts
lib/onboarding/events.ts
```

Core responsibilities:

- resolve the current user role
- resolve the current route
- inspect feature state
- filter definitions by role, route, and conditions
- suppress completed or dismissed modules
- prioritize the best eligible module

Suggested functions:

```ts
getEligibleOnboardingModules(input): OnboardingModuleDefinition[]
getNextOnboardingModule(input): OnboardingModuleDefinition | null
markModuleCompleted(...)
markModuleDismissed(...)
markChecklistStepCompleted(...)
markReleaseSeen(...)
```

### 4. Onboarding UI Layer

Recommended location:

```txt
components/onboarding/
  OnboardingProvider.tsx
  OnboardingLauncher.tsx
  OnboardingModal.tsx
  OnboardingCoachmark.tsx
  OnboardingChecklistCard.tsx
  OnboardingHint.tsx
  WhatsNewPrompt.tsx
```

Responsibilities:

- render the chosen module
- show the correct UI for the module type
- persist dismiss / complete events
- avoid rendering for blocked roles or unavailable selectors

### 5. API Layer

Recommended routes:

```txt
app/api/onboarding/state/route.ts
app/api/onboarding/events/route.ts
```

Suggested API behavior:

- `GET /api/onboarding/state`
  - returns the signed-in user onboarding state

- `POST /api/onboarding/state`
  - updates dismiss / complete / seen-release state

- `POST /api/onboarding/events`
  - records product events like first saved check-in, first habit save, first team created

## Event Model

Use events to complete modules automatically when possible.

Recommended event names:

- `auth.first_login`
- `athlete.checkin_saved`
- `athlete.habit_saved`
- `athlete.weekly_summary_viewed`
- `trainer.dashboard_viewed`
- `trainer.plan_saved`
- `admin.team_created`
- `admin.user_invited`
- `admin.user_role_updated`
- `news.release_opened`

## Route Integration

### Athlete

Priority athlete modules:

1. `athlete-first-login`
2. `athlete-first-checkin`
3. `athlete-habit-tracker`
4. `athlete-trend-reading`
5. `athlete-weekly-summary`
6. `athlete-news-whats-new`

Target routes:

- `/{locale}/athletes/[id]`
- `/{locale}/dashboard/assessment` for athlete self-check-in
- `/{locale}/news`

### Trainer

Priority trainer modules:

1. `trainer-dashboard-intro`
2. `trainer-athlete-detail`
3. `trainer-planning-week`
4. `trainer-team-scope`
5. `trainer-recommendations`

Target routes:

- `/{locale}/dashboard`
- `/{locale}/dashboard/athletes/[id]`
- `/{locale}/dashboard/planning`

### Admin

Priority admin modules:

1. `admin-user-rights`
2. `admin-team-setup`
3. `admin-athlete-assignment`
4. `admin-standards-governance`
5. `admin-restore-and-audit`

Target routes:

- `/{locale}/dashboard/settings`

## Suggested Persistence and Repository Files

Recommended additions:

```txt
types/onboarding.ts
types/onboarding-state.ts
repositories/onboarding-state.repository.ts
services/onboarding-service.ts
lib/onboarding/types.ts
lib/onboarding/engine.ts
lib/onboarding/events.ts
lib/onboarding/definitions/athlete.ts
lib/onboarding/definitions/trainer.ts
lib/onboarding/definitions/admin.ts
components/onboarding/OnboardingProvider.tsx
components/onboarding/OnboardingChecklistCard.tsx
components/onboarding/OnboardingModal.tsx
components/onboarding/OnboardingCoachmark.tsx
app/api/onboarding/state/route.ts
app/api/onboarding/events/route.ts
```

## Delivery Phases

### Phase 1: Foundation

Deliver:

- onboarding types
- state collection
- read/write onboarding API
- definitions registry
- engine
- provider
- one modal
- one checklist card

Acceptance:

- onboarding state persists per signed-in user
- one module can be shown or dismissed based on role and route

### Phase 2: Athlete Onboarding

Deliver:

- first login intro
- self-only check-in intro
- habit tracker checklist
- trends explanation
- weekly summary prompt

Acceptance:

- athlete sees only athlete-targeted onboarding
- first successful check-in completes the related module automatically

### Phase 3: Trainer Onboarding

Deliver:

- dashboard intro
- athlete detail explanation
- planning-week checklist
- recommendation interpretation hints

Acceptance:

- trainer sees only trainer-targeted onboarding
- planning save can complete planning onboarding

### Phase 4: Admin Onboarding

Deliver:

- settings intro
- user rights walkthrough
- team creation checklist
- athlete assignment hinting

Acceptance:

- admin sees only admin-targeted onboarding
- first team created advances admin setup checklist

### Phase 5: Release-Note Integration

Deliver:

- connect weekly news posts to release module definitions
- mark release modules as seen when users open them
- show "what's new" prompts only once per version

Acceptance:

- newly released features can be introduced by news-driven onboarding prompts

## UX Rules

1. Do not auto-launch a long tour on every login.
2. Prefer a short intro and a small checklist.
3. Never show onboarding for a route the user cannot access.
4. If a selector is missing, drop the step instead of breaking the page.
5. Do not show more than one blocking modal at a time.
6. Use release onboarding only for meaningful shipped changes.

## Recommended First Slice

The best first implementation slice is:

1. foundation
2. athlete first-login intro
3. athlete first-check-in module
4. athlete habit tracker checklist

This gives immediate value with the lowest architectural risk and matches the current product spine.
