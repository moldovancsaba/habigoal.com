# KIDEX Definition of Done (DoD)

## 1. Build Quality
- [ ] `npm run build` must complete without any errors.
- [ ] `npm run build` must complete without any warnings (linting, deprecations, or obsolescence).
- [ ] Node.js version must be pinned to `22.x` in `package.json`.

## 2. Technical Standards
- [ ] **Async Params**: `params` and `searchParams` in layouts and pages must be treated as Promises.
- [ ] **i18n Routing**: Use the current `createNavigation` and `defineRouting` API from `next-intl`.

## 3. Communication Style
- [ ] **Factual Reporting**: Describe what was changed without using hyperbolic words (e.g., avoid "robust", "reliable", "state-of-the-art").
- [ ] **Tested Claims**: Only claim something works if it has been verified via a successful build or manual test.
- [ ] **Concise Summary**: Keep summaries brief and technical.

## 4. UI & i18n
- [ ] All user-facing strings must be in `/messages`.
- [ ] No technical jargon in the UI.
- [ ] UI must follow the design system documented in `docs/design-system.md`.
