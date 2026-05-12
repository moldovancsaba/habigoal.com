# Central Form System Architecture

## Goal

Replace page-owned form implementations with a centralized form system so Habigoal can:

- keep field labels, placeholders, help text, and ordering consistent
- enforce role-aware visibility in one place
- connect validation, onboarding, and reporting to stable field ids
- reduce i18n drift by moving form copy into a single structured source
- support reuse across athlete, trainer, and admin surfaces

## Target model

### 1. Form definitions

Store every form as a structured definition rather than a page-local UI implementation.

Examples:

- `daily_checkin`
- `athlete_baseline_profile`
- `team_setup`
- `user_access`
- `weekly_plan`

Each definition should include:

- `id`
- `version`
- `sections`
- `role visibility`
- `submission shape`
- `field order`

### 2. Field registry

Implement field types once, then reuse them everywhere.

Initial registry:

- `text`
- `textarea`
- `number`
- `select`
- `multiselect`
- `checkbox`
- `date`
- `rating`
- `attachment`

Each field type should define:

- renderer
- display rules
- validation adapter
- default formatting behavior

### 3. Validation layer

Validation should move from page-local conditionals into schema-driven rules.

Validation responsibilities:

- required state
- range rules
- allowed values
- conditional visibility rules
- normalized submission output

### 4. Renderer

Pages should call a shared renderer, not rebuild forms manually.

Example shape:

```tsx
<FormRenderer
  formId="daily_checkin"
  role="athlete"
  locale={locale}
  initialValues={initialValues}
  context={context}
  onSubmit={handleSubmit}
/>
```

### 5. Page adapters

Pages remain responsible only for:

- loading context data
- providing initial values
- providing submit handlers
- routing after success
- surface-specific layout

They should not own field copy, field order, or field validation rules.

## Dependency order

### Phase 1

Build the central foundation:

- form-definition model
- field registry contract
- renderer shell
- validation adapter contract

### Phase 2

Centralize shared infrastructure:

- i18n binding for form copy
- role and visibility rules
- stable field ids for onboarding and analytics

### Phase 3

Migrate the highest-risk form first:

- daily check-in

This is the best proving surface because it already powers athlete, trainer, reporting, onboarding, and analytics flows.

### Phase 4

Migrate athlete management forms:

- athlete create/edit
- baseline profile

### Phase 5

Migrate admin forms:

- user access
- team setup
- standards manager

### Phase 6

Cleanup and governance:

- remove duplicated page-local form code
- add form audit tooling
- add contributor rules so new forms cannot bypass the central system

## Explicit non-goals for v1

- full drag-and-drop form builder
- runtime no-code schema editing for admins
- external plugin form marketplace

These can come later. First priority is internal consistency and maintainability.

## Mapping to GitHub delivery

1. Parent epic: centralized form system
2. Foundation issue
3. Registry and renderer issue
4. i18n/visibility/validation issue
5. Daily check-in migration issue
6. Athlete profile migration issue
7. Admin form migration issue
8. Cleanup and enforcement issue

## Success criteria

The migration is successful when:

- new forms are defined centrally rather than inside pages
- athlete, trainer, and admin surfaces consume the shared renderer
- labels and help text are locale-driven from one source
- onboarding and reporting reference stable field ids instead of page-specific assumptions
- the i18n audit no longer flags the migrated form surfaces for hardcoded field copy
