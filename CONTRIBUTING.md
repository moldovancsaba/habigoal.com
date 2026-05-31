# Contributing

## Branching and merge policy

- `main` is protected and must be updated only through pull requests.
- Use branch names with `sentinel-squad/` prefix.
- Do not commit directly on `main`.

## Local preflight

Install repository hooks once per clone:

```bash
npm run hooks:install
```

This installs `.githooks/pre-push`, which runs:

```bash
npm run lockfile:check
npm run typecheck
npm run build
```

## Pull request checklist

Before requesting review:

```bash
npm run lockfile:check
npm ci
npm run typecheck
npm run build
```

## Code ownership

Critical runtime, auth, workflow, and release-control paths are protected with CODEOWNERS in `.github/CODEOWNERS`.
