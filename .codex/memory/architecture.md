# Habigoal Codex Automation Architecture

## System Boundary

Habigoal uses GitHub for source control, issues, project state, commits, and pull requests.

Habigoal uses Codex as the autonomous orchestration layer for:
- audit loops
- planning loops
- implementation loops
- documentation loops
- persistent repository memory

GitHub is not the orchestration runtime.
GitHub Actions may still be useful for CI, but they are not the planner or executor for autonomous product work.

## Core Rule

This repository is designed for heartbeat-driven autonomous loops in one dedicated Codex conversation, not CI-triggered implementation workflows.

The loop must preserve:
- persistent context
- iterative improvement
- explicit memory
- architecture constraints
- human approval at merge time

## Runtime Model

Codex runtime responsibilities:
- maintain project memory
- inspect repository context
- read and update GitHub Project state
- create or update issues
- implement safe work on branches
- open pull requests

GitHub responsibilities:
- store source history
- store issues and roadmap state
- provide project board visibility
- hold pull requests for human review and merge

UI operating surfaces:
- `/dashboard` remains the coach triage and recommendation surface.
- `/dashboard/planning` is the coach planning surface for turning live readiness and load state into a weekly session shape, with persisted weekly plans in `session_plans`.
- `/dashboard/athletes/[id]` remains the athlete operating surface with trends, habits, memory, and reports.
- `/athletes` is the public athlete app entry surface, and `/athletes/[id]` must stay athlete-facing rather than leaking coach-admin controls.
- When authentication is enforced, `/athletes` must redirect signed-in athletes to their own profile and redirect trainer/admin users back into dashboard athlete management rather than behaving like a shared athlete selector.
- Role-aware route gating must exist in the shell layer as well as in APIs: athletes should not browse coach-admin dashboard routes, and trainers should not reach admin settings routes by URL.
- DoneIsBetter SSO is the intended authentication boundary for protected Habigoal usage, while local role authorization remains owned by the `users` collection.
- User-rights changes are admin-owned operations; the system must not allow self-removal of the active admin or deletion/demotion of the final admin account.
- The active entity model is `athlete`, `trainer`, and `admin`; athlete access is self-scoped, trainer access is team-scoped, and admin access owns settings plus team management.

## Heartbeat Chain

## Conversation Model

All autonomous work should run inside one dedicated Codex chat thread.

Why:
- the loop keeps persistent conversational context
- planning, implementation, and documentation decisions stay attached to one trace
- memory drift is lower than with detached multi-thread automation

The live automation runtime should therefore use a heartbeat attached to the dedicated thread, not detached GitHub-orchestrated jobs.

## Logical Phases

### 1. Audit

Cadence: every 3 hours within the dedicated thread

Responsibilities:
- scan for bugs and regressions
- identify dead code and architecture drift
- identify missing tests and stale docs
- create or update GitHub issues
- refresh project and memory risk state

### 2. Planner

Cadence: same 3-hour loop, immediately after audit in the same thread

Responsibilities:
- rank highest leverage work
- avoid duplicate task selection
- update current focus and backlog order
- keep the project board aligned with actual priorities

### 3. Implementer

Cadence: same 3-hour loop, immediately after planner in the same thread

Responsibilities:
- take the safest high-value task
- implement on a branch
- run lint, test, and build
- push branch changes
- open or update a pull request

### 4. Docs

Cadence: same 3-hour loop, immediately after implementer in the same thread

Responsibilities:
- update README, handover, and architecture notes
- keep onboarding and release-facing docs current
- validate build before documentation PRs

## Safety Model

Standing user consent is granted for continuous automation execution.

That consent does not allow:
- direct pushes to `main`
- force pushes
- autonomous merges without tests
- autonomous merges without human review

The intended approval model is:
- no interactive approval prompts during normal automation runs in the dedicated thread
- branch and pull-request based delivery
- human merge approval on GitHub

## Branching Model

Autonomous implementation should:
- create a task branch
- commit only validated work
- push to origin
- open or update a pull request

Autonomous implementation should not:
- amend unrelated user work
- rewrite shared history
- merge its own pull request

## Memory Contract

The loop depends on persistent memory in:
- `.codex/memory/project_state.json`
- `.codex/memory/backlog.json`
- `.codex/memory/architecture.md`

Every heartbeat should treat those files as part of the runtime state, not as passive documentation.

## Habigoal-Specific Focus

The current product spine is:
1. coach command center
2. athlete trend interpretation
3. athlete daily operating dashboard
4. habit adherence and routine scoring
5. session planning and weekly operating summaries

Automation should prefer sharpening this spine before broad platform expansion.

Current persistence surfaces that support this spine:
- `assessments` for daily check-ins and computed readiness
- `children` for athlete identity and profile
- `coach_actions` for coach response traceability
- `habit_records` for athlete routine completion and adherence trends
