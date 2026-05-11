# Branching Policy

Autonomous work must use branch-first delivery.

Required behavior:
- create a dedicated task branch
- keep commits scoped to one task or one tightly related task slice
- push the branch to origin
- open or update a pull request

Disallowed behavior:
- direct pushes to `main`
- force pushes
- history rewrites on shared branches
- bundling unrelated fixes into one pull request

Branch naming guidance:
- `sentinel-squad/issue-<number>-<slug>`
- if no issue exists yet, create or update the issue first whenever reasonable
