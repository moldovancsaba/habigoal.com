# Implementation-4 Project Structure and Dependency Map

## Purpose

This document is the executable project-board companion for:

- Milestone: `ClassScout 2.0 - implementation-4 implementation pack` (#6)
- Issues: `#127` to `#146`
- Source: `implementation-4.md`
- Mandatory design-system constraint: use `@doneisbetter/gds` for all UI/UX work.

## Board Alignment

- Repository: `moldovancsaba/habigoal.com`
- GitHub Project: `https://github.com/users/moldovancsaba/projects/14`
- Target track for new workstream: `command-center`/`guidance` area alignment should be validated manually against board conventions, because this board model predates classscout-specific tracks.

## Sequencing

Execution order is deterministic:

1. `127` Baseline architecture and discovery-readiness audit for implementation-4
2. `128` Provider and activity schema normalization for trusted discovery
3. `129` Location taxonomy and canonical geospatial IDs
4. `130` Category taxonomy and normalized classification
5. `131` SEO discovery pages and canonical route generation
6. `132` Faceted discovery search API and filters
7. `133` Parent and household account foundations
8. `134` Child activity profile and preferences contract
9. `135` Saved locations and preference profile engine
10. `136` Onboarding survey schema and completion pipeline
11. `137` Participation and activity feedback state machine
12. `138` AI source ingestion and extraction confidence service
13. `139` Human review queue for low-confidence listings
14. `140` Recommendation scoring v1 and trust-safe ranking
15. `141` Recommendation explainability and feedback controls
16. `142` Parent personalized dashboard and recommendation onboarding
17. `143` Provider claim and correction workflow
18. `144` Provider verification, lead capture, and paid-tier readiness
19. `145` Privacy export, deletion, and consent lifecycle
20. `146` Implementation-4 observability, SLOs, and incident runbook

## Dependency Graph

Directed dependencies for execution:

- `127` is a hard start anchor.
- `128`,`133` depend on `127`.
- Discovery foundation (`128`,`129`,`130`) gates `131`,`132`.
- Account/profile foundation (`133`,`134`) gates profiles, surveys, preferences, and UX.
- Feedback (`137`) depends on discovery search and profile contracts (`131`,`132`,`134`).
- Ranking (`140`) depends on search/profiles/preferences (`132`,`134`,`135`,`137`).
- Recommendation UI (`141`) depends on scoring (`140`).
- Parent dashboard (`142`) depends on profile/preferences/recommendations (`133`,`134`,`135`,`137`,`140`,`141`).
- Provider operations (`143`) depends on ingestion/review (`138`,`139`).
- Provider verification (`144`) depends on dashboard and claim flows (`142`,`143`).
- Privacy (`145`) depends on account/profile (`133`,`134`).
- Observability (`146`) depends on ranking/search/review/provider/privacy (`131`,`132`,`138`,`139`,`140`,`143`,`145`).

## Repository Artifacts

- `config/implementation-4-artifacts.json` contains machine-readable issue list, sequencing order, dependencies, labels, and graph edges.
- `docs/project-brief-2026-06-07.md` is updated by board operations to reflect board state.
- Milestone and labels are managed directly in GitHub via REST/CLI and remain queryable by `source:implementation-4` and milestone `6`.

## Operational Notes

- Each implementation-4 issue body includes:
  - architecture
  - runtime flow
  - contracts
  - APIs
  - pseudo-code
  - UX states
  - accessibility
  - observability
  - retries/timeouts
  - rollback/recovery
  - testing
  - documentation
  - dependencies
  - execution order
  - edge cases
  - operational behavior
- Any issue status migration and board field updates must be done through a GraphQL-capable sync pass when API limit allows.

## Handoff

When resuming board synchronization, use:

- `./scripts/sync-gh-project-14.sh` for project item creation/status baseline sync.
- `gh api` issue list query with `milestone=6` and `label=source:implementation-4` for filtering and dependency QA.
