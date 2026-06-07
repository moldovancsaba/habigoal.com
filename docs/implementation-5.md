# Implementation 5: Form Registry Foundation

This delivery establishes the Habigoal form governance registry used by later form migration work.

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

## Runtime Flow

1. `getFormRegistrySnapshot()` loads the last known registry snapshot.
2. `canonicalizeFormRegistry()` normalizes routes, fields, GDS component families, locales, auth roles, owner teams, lifecycle state, and blockers.
3. Duplicate artifact IDs are deduped by keeping the richer artifact.
4. `summarizeFormRegistry()` reports artifact count, blocker count, duplicate route conflicts, domains, and owners.
5. `GET /api/admin/form-registry` returns the read-only snapshot and summary for admin users.

## Operational Behavior

- Endpoint: `GET /api/admin/form-registry`
- Auth: admin only through existing `requireRole()` behavior.
- Cache: `no-store`; release changes invalidate the snapshot by commit.
- Observability fields are available in the response summary: artifact count, blocker count, route conflict count, domains, and owners.

## Rollback and Recovery

`withFormRegistryFallback()` returns the last known-good snapshot and marks the response blocked if a future scanner/parser fails. This keeps downstream migration gates visible instead of failing silently.

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
