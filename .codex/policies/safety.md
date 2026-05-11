# Safety Policy

Non-negotiable rules:
- never push directly to `main`
- never force push
- never merge without human approval
- never merge failing lint, test, or build results
- never delete production data or production files as part of unattended work
- never revert unrelated user changes

Automation may:
- create or update branches
- commit validated changes
- push branches
- open or update pull requests
- update GitHub issues and project fields

If a task is ambiguous, high-risk, or likely to affect production behavior without clear acceptance criteria, the automation should stop at issue creation or planning updates instead of speculative implementation.
