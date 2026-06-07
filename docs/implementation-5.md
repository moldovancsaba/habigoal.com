# Implementation 5: Form Registry Foundation

This delivery establishes the Habigoal form governance registry and compiler layer used by later form migration work.

## Registry Snapshot

The canonical snapshot lives at `config/form-registry.json` and uses this shape:

```ts
type FormArtifact = {
  id: string;
  domain: string;
  route: string;
  fields: string[];
  gdsComponentSet: string[];
  locales: string[];
  requiresAuth: string[];
  ownerTeam: string[];
  lifecycleState?: "discovered" | "migrate" | "ready" | "blocked" | "retired";
  blockers?: string[];
};
```

The initial snapshot covers admin settings, athlete check-in, athlete profile, and team role-management forms.

## Compiler Contract

`lib/forms/compiler.ts` compiles registry artifacts into runtime contracts:

```ts
type CompiledFormContract = {
  formId: string;
  route: string;
  domain: string;
  fields: Array<{ id: string; name: string; type: string; required: boolean; options?: string[] }>;
  apiEndpoint: string;
  responseSchemaVersion: number;
  locales: string[];
  requiresAuth: string[];
  ownerTeam: string[];
};
```

The compiler validates duplicate fields, empty field sets, missing locale maps, and unsupported GDS component families. Diagnostics are stable and sorted so CI and admin tooling can compare results predictably.

## Runtime Flow

1. `getFormRegistrySnapshot()` loads the last known registry snapshot.
2. `canonicalizeFormRegistry()` normalizes routes, fields, GDS component families, locales, auth roles, owner teams, lifecycle state, and blockers.
3. Duplicate artifact IDs are deduped by keeping the richer artifact.
4. `summarizeFormRegistry()` reports artifact count, blocker count, duplicate route conflicts, domains, and owners.
5. `compileFormContracts()` turns registry artifacts into frontend/server contracts and compatibility diagnostics.
6. `GET /api/admin/form-registry` returns the read-only snapshot and summary for admin users.
7. `GET /api/forms/contracts` returns compiled contracts and diagnostics for admin/trainer sanity checks.

## Operational Behavior

- Endpoint: `GET /api/admin/form-registry`
- Endpoint: `GET /api/forms/contracts`
- Auth: registry endpoint is admin only; contract endpoint is admin/trainer through existing `requireRole()` behavior.
- Cache: `no-store`; release changes invalidate the snapshot by commit.
- Observability fields are available in response summaries: artifact count, blocker count, route conflict count, contract count, drift error count, compiler error codes, domains, and owners.

## Rollback and Recovery

`withFormRegistryFallback()` returns the last known-good snapshot and marks the response blocked if a future scanner/parser fails. This keeps downstream migration gates visible instead of failing silently.

`compileWithFallback()` keeps previous stable contracts available when compilation fails and marks the result failed so build/admin gates can stop unsafe rollout.

Rollback is a code/config revert only. No database migration or destructive cleanup is part of this foundation.

## Verification

Required commands:

```bash
npm run lint
npm run test
npm run typecheck
npm run build
npm run gds:compliance
npm run semantic:audit
npm run i18n:audit
```

Local verification was not run by Codex because the agent shell cannot spawn `/bin/zsh`, `/bin/bash`, or `/bin/sh` in the current environment. CI must validate the PR.

Delivery verification on GitHub completed successfully for the final implementation branch before merge handoff:

- GitHub Actions CI #140 passed `lockfile:check`, `npm ci`, `typecheck`, and `build`.
- Vercel deployment status passed for the final implementation branch.
- The automated review thread for the team role-management route was resolved by pointing the artifact at the existing settings route.
- Auto-merge is enabled; final merge remains governed by the repository's protected-branch review requirement.
